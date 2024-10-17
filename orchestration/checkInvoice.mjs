/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from "config";
import utils from "zkp-utils";
import GN from "general-number";
import fs from "fs";

import {
	getContractInstance,
	getContractAddress,
	registerKey,
} from "./common/contract.mjs";
import {
	storeCommitment,
	getCurrentWholeCommitment,
	getCommitmentsById,
	getAllCommitments,
	getInputCommitments,
	joinCommitments,
	splitCommitments,
	markNullified,
} from "./common/commitment-storage.mjs";
import { generateProof } from "./common/zokrates.mjs";
import { getMembershipWitness, getRoot } from "./common/timber.mjs";
import {
	decompressStarlightKey,
	compressStarlightKey,
	encrypt,
	decrypt,
	poseidonHash,
	scalarMult,
} from "./common/number-theory.mjs";

const { generalise } = GN;
const db = "/app/orchestration/common/db/preimage.json";
const keyDb = "/app/orchestration/common/db/key.json";

export class CheckInvoiceManager {
	constructor(web3) {
		this.web3 = web3;
	}

	async init() {
		this.instance = await getContractInstance("TieredPricingShield");
		this.contractAddr = await getContractAddress("TieredPricingShield");
	}

	async checkInvoice(
		_invoice,
		_purchaseOrderId,
		_orderedQuantities_sku_newOwnerPublicKey = 0
	) {
		const instance = this.instance;
		const contractAddr = this.contractAddr;
		const web3 = this.web3;
		const invoice = generalise(_invoice);
		const purchaseOrderId = generalise(_purchaseOrderId);
		let orderedQuantities_sku_newOwnerPublicKey = generalise(
			_orderedQuantities_sku_newOwnerPublicKey
		);

		// Read dbs for keys and previous commitment values:

		if (!fs.existsSync(keyDb))
			await registerKey(utils.randomHex(31), "TieredPricingShield", true);
		const keys = JSON.parse(
			fs.readFileSync(keyDb, "utf-8", (err) => {
				console.log(err);
			})
		);
		const secretKey = generalise(keys.secretKey);
		const publicKey = generalise(keys.publicKey);

		// Initialise commitment preimage of whole state:

		let orderedQuantities_sku_stateVarId = 30;

		let orderedQuantities = {
			skus: Array(9).fill(generalise(0)),
			newCommitments: Array(9).fill(generalise(0)),
			newValues: Array(9).fill(generalise(0)),
			oldCommitments: Array(9).fill(generalise(0)),
			newSalts: Array(9).fill(generalise(0)),
			commitmentExists: Array(9).fill(false),
			prevValues: Array(9).fill(generalise(0)),
			prevSalts: Array(9).fill(generalise(0)),
			indices: Array(9).fill(generalise(0)),
			paths: Array(9).fill(generalise(Array(32).fill(0)).all),
			nullifiers: Array(9).fill(generalise(0))
		};


		const getPrevOrderedQuantitiesCommitment = async (sku, index) => {

			const orderedQuantities_sku_stateVarId_key = generalise(sku);
	
			const orderedQuantities_sku_stateVarId_hash = generalise(
				poseidonHash(
					[
						generalise(orderedQuantities_sku_stateVarId).bigInt,
						orderedQuantities_sku_stateVarId_key.bigInt,
					]
				)
			).hex(32);
		
			let orderedQuantities_sku_commitmentExists = true;
			let orderedQuantities_sku_witnessRequired = true;
		
			const orderedQuantities_sku_commitment = await getCurrentWholeCommitment(
				orderedQuantities_sku_stateVarId_hash
			);
		
			let orderedQuantities_sku_preimage = {
				value: 0,
				salt: 0,
				commitment: 0,
			};
			if (!orderedQuantities_sku_commitment) {
				orderedQuantities_sku_commitmentExists = false;
				orderedQuantities_sku_witnessRequired = false;
			} else {
				orderedQuantities_sku_preimage = orderedQuantities_sku_commitment.preimage;
			}
	
			// read preimage for whole state
			orderedQuantities_sku_newOwnerPublicKey =
				_orderedQuantities_sku_newOwnerPublicKey === 0
					? publicKey
					: orderedQuantities_sku_newOwnerPublicKey;
	
			const orderedQuantities_sku_currentCommitment = orderedQuantities_sku_commitmentExists
				? generalise(orderedQuantities_sku_commitment._id)
				: generalise(0);
			const orderedQuantities_sku_prev = generalise(
				orderedQuantities_sku_preimage.value
			);
			const orderedQuantities_sku_prevSalt = generalise(
				orderedQuantities_sku_preimage.salt
			);
	
			// Extract set membership witness:
	
			// generate witness for whole state
			const orderedQuantities_sku_emptyPath = new Array(32).fill(0);
			const orderedQuantities_sku_witness = orderedQuantities_sku_witnessRequired
				? await getMembershipWitness(
						"TieredPricingShield",
						orderedQuantities_sku_currentCommitment.integer
				)
				: {
						index: 0,
						path: orderedQuantities_sku_emptyPath,
						root: (await getRoot("TieredPricingShield")) || 0,
				};
			const orderedQuantities_sku_index = generalise(
				orderedQuantities_sku_witness.index
			);
	
			const orderedQuantities_sku_path = generalise(
				orderedQuantities_sku_witness.path
			).all;
	
			// Calculate nullifier(s):
	
			let orderedQuantities_sku_nullifier = orderedQuantities_sku_commitmentExists
			? poseidonHash([
					BigInt(orderedQuantities_sku_stateVarId_hash),
					BigInt(secretKey.hex(32)),
					BigInt(orderedQuantities_sku_prevSalt.hex(32)),
			])
			: poseidonHash([
					BigInt(orderedQuantities_sku_stateVarId_hash),
					BigInt(generalise(0).hex(32)),
					BigInt(orderedQuantities_sku_prevSalt.hex(32)),
			]);
	
			orderedQuantities.nullifiers[index] = orderedQuantities_sku_nullifier;
			orderedQuantities.skus[index] = generalise(sku);
			orderedQuantities.oldCommitments[index] = orderedQuantities_sku_currentCommitment;
			orderedQuantities.prevValues[index] = orderedQuantities_sku_prev;
			orderedQuantities.prevSalts[index] = orderedQuantities_sku_prevSalt;
			orderedQuantities.commitmentExists[index] = orderedQuantities_sku_commitmentExists;
			orderedQuantities.indices[index] = orderedQuantities_sku_index;
			orderedQuantities.paths[index] = orderedQuantities_sku_path;
	
			return orderedQuantities_sku_prev;
	
		}
	
		const createOrderedQuantitiesNewCommitment = async (sku, newValue, index) => {
			
			// Calculate commitment(s):
			const orderedQuantities_sku_stateVarId_key = generalise(sku);
			const orderedQuantities_sku_newSalt = generalise(utils.randomHex(31));
	
			const orderedQuantities_sku_stateVarId_hash = generalise(
				poseidonHash(
					[
						generalise(orderedQuantities_sku_stateVarId).bigInt,
						orderedQuantities_sku_stateVarId_key.bigInt,
					]
				)
			).hex(32);
	
			let orderedQuantities_sku_newCommitment = poseidonHash([
				BigInt(orderedQuantities_sku_stateVarId_hash),
				BigInt(generalise(newValue).hex(32)),
				BigInt(orderedQuantities_sku_newOwnerPublicKey.hex(32)),
				BigInt(orderedQuantities_sku_newSalt.hex(32)),
			]);
	
			orderedQuantities_sku_newCommitment = generalise(
				orderedQuantities_sku_newCommitment.hex(32)
			); // truncate
	
			orderedQuantities.newCommitments[index] = orderedQuantities_sku_newCommitment;
			orderedQuantities.newValues[index] = generalise(newValue);
			orderedQuantities.newSalts[index] = orderedQuantities_sku_newSalt;
		}

		// Initialise commitment preimage of whole accessed state:

		let purchaseOrder_purchaseOrderId_stateVarId = 50;

		purchaseOrder_purchaseOrderId_stateVarId = poseidonHash([
			BigInt(purchaseOrder_purchaseOrderId_stateVarId),
			BigInt(purchaseOrderId.hex(32)),
		]).hex(32);

		let purchaseOrder_purchaseOrderId_commitmentExists = true;

		const purchaseOrder_purchaseOrderId_commitment =
			await getCurrentWholeCommitment(
				purchaseOrder_purchaseOrderId_stateVarId
			);

		const purchaseOrder_purchaseOrderId_preimage =
			purchaseOrder_purchaseOrderId_commitment.preimage;

		const purchaseOrder_purchaseOrderId = generalise(
			purchaseOrder_purchaseOrderId_preimage.value
		);

		// read preimage for accessed state

		const purchaseOrder_purchaseOrderId_currentCommitment = generalise(
			purchaseOrder_purchaseOrderId_commitment._id
		);
		const purchaseOrder_purchaseOrderId_prev = generalise(
			purchaseOrder_purchaseOrderId_preimage.value
		);
		const purchaseOrder_purchaseOrderId_prevSalt = generalise(
			purchaseOrder_purchaseOrderId_preimage.salt
		);

		// non-secret line would go here but has been filtered out

		for (let index = 0; index < invoice.length; index++) {
			let sku = generalise(parseInt(invoice[index].sku.integer, 10));

			let orderedQuantities_sku = await getPrevOrderedQuantitiesCommitment(sku, index);

			let po = generalise(purchaseOrder_purchaseOrderId[index]);
		

			if (
				!(
					parseInt(po.quantity.integer, 10) != 0 &&
					parseInt(po.subTotal.integer, 10) != 0
				)
			) {
				throw new Error(
					"Require statement not satisfied: Either purchase order Id or sku is incorrect"
				);
			}
			if (
				!(
					parseInt(po.quantity.integer, 10) ==
					parseInt(invoice[index].quantity.integer, 10)
				)
			) {
				throw new Error(
					"Require statement not satisfied: Invoice quantity does not match with PO"
				);
			}
			if (
				!(
					parseInt(po.subTotal.integer, 10) ==
					parseInt(invoice[index].subTotal.integer, 10)
				)
			) {
				throw new Error(
					"Require statement not satisfied: Invoice subTotal does not match with PO"
				);
			}
			orderedQuantities_sku = generalise(
				parseInt(orderedQuantities_sku.integer, 10) +
					parseInt(invoice[index].quantity.integer, 10)
			);

			await createOrderedQuantitiesNewCommitment(sku, orderedQuantities_sku, index);

		}

		// Extract set membership witness:

		// generate witness for whole accessed state
		const purchaseOrder_purchaseOrderId_witness =
			await getMembershipWitness(
				"TieredPricingShield",
				purchaseOrder_purchaseOrderId_currentCommitment.integer
			);
		const purchaseOrder_purchaseOrderId_index = generalise(
			purchaseOrder_purchaseOrderId_witness.index
		);
		const purchaseOrder_purchaseOrderId_root = generalise(
			purchaseOrder_purchaseOrderId_witness.root
		);
		const purchaseOrder_purchaseOrderId_path = generalise(
			purchaseOrder_purchaseOrderId_witness.path
		).all;

		// Calculate nullifier(s):

		let purchaseOrder_purchaseOrderId_nullifier =
			purchaseOrder_purchaseOrderId_commitmentExists
				? poseidonHash([
						BigInt(purchaseOrder_purchaseOrderId_stateVarId),
						BigInt(secretKey.hex(32)),
						BigInt(purchaseOrder_purchaseOrderId_prevSalt.hex(32)),
				  ])
				: poseidonHash([
						BigInt(purchaseOrder_purchaseOrderId_stateVarId),
						BigInt(generalise(0).hex(32)),
						BigInt(purchaseOrder_purchaseOrderId_prevSalt.hex(32)),
				  ]);

		purchaseOrder_purchaseOrderId_nullifier = generalise(
			purchaseOrder_purchaseOrderId_nullifier.hex(32)
		); // truncate

		// Calculate commitment(s):

		console.log(purchaseOrder_purchaseOrderId_prev);

		if (invoice.length < 9) invoice.push(...Array(9 - invoice.length).fill({sku: generalise(0), quantity: generalise(0), subTotal: generalise(0)}));
		if (purchaseOrder_purchaseOrderId_prev.length < 9) purchaseOrder_purchaseOrderId_prev.push(...Array(9 - purchaseOrder_purchaseOrderId_prev.length).fill({sku: generalise(0), quantity: generalise(0), subTotal: generalise(0)}));
		// Call Zokrates to generate the proof:
		const allInputs = [
			invoice.map(invoiceLine => [invoiceLine.sku.integer, invoiceLine.quantity.integer, invoiceLine.subTotal.integer]),
			purchaseOrderId.integer,
			secretKey.integer,
			orderedQuantities.nullifiers.map(n => n.integer),
			orderedQuantities.prevValues.map(v => v.integer),
			orderedQuantities.prevSalts.map(s => s.integer),
			orderedQuantities.commitmentExists.map(b => b ? 0 : 1),
			purchaseOrder_purchaseOrderId_root.integer,
			orderedQuantities.indices.map(i => i.integer),
			orderedQuantities.paths.map(p => p.integer),
			orderedQuantities_sku_newOwnerPublicKey.integer,
			orderedQuantities.newSalts.map(s => s.integer),
			orderedQuantities.newCommitments.map(c => c.integer),
			secretKey.integer,
			purchaseOrder_purchaseOrderId_nullifier.integer,
			purchaseOrder_purchaseOrderId_prev.map(orderLine => [orderLine.sku.integer, orderLine.quantity.integer, orderLine.subTotal.integer]),
			purchaseOrder_purchaseOrderId_prevSalt.integer,

			purchaseOrder_purchaseOrderId_index.integer,
			purchaseOrder_purchaseOrderId_path.integer,
		].flat(Infinity);

		console.log(allInputs.join(' '));
		const res = await generateProof("checkInvoice", allInputs);
		const proof = generalise(Object.values(res.proof).flat(Infinity))
			.map((coeff) => coeff.integer)
			.flat(Infinity);

		let BackupData = [];

		// Encrypt pre-image for state variable orderedQuantities_sku as a backup:
		let orderedQuantities_sku_bcipherText = [];
		let orderedQuantities_sku_cipherText_combined = [];

		for (let i = 0; i < _invoice.length; i++) {

		
		orderedQuantities_sku_bcipherText[i] = encrypt(
			[
				BigInt(orderedQuantities.newSalts[i].hex(32)),
				BigInt(generalise(orderedQuantities.skus[i]).hex(32)),
				BigInt(generalise(orderedQuantities_sku_stateVarId).hex(32)),
				BigInt(orderedQuantities.newValues[i].hex(32)),
			],
			masterZkpSecretKey.hex(32),
			[
				decompressStarlightKey(masterZkpPublicKey)[0].hex(32),
				decompressStarlightKey(masterZkpPublicKey)[1].hex(32),
			].hex(32),
		);

		orderedQuantities_sku_cipherText_combined[i] = {
			varName: "orderedQuantities a",
			cipherText: orderedQuantities_sku_bcipherText[i],
			ephPublicKey: masterZkpPublicKey.hex(32),
		};

		BackupData.push(orderedQuantities_sku_cipherText_combined[i]);

	}

		// Send transaction to the blockchain:

		const txData = await instance.methods
			.checkInvoice(
				{
					customInputs: [1],
					newNullifiers: orderedQuantities.nullifiers.map(n => n.integer),
					commitmentRoot: purchaseOrder_purchaseOrderId_root.integer,
					checkNullifiers: [
						purchaseOrder_purchaseOrderId_nullifier.integer,
					],
					newCommitments: orderedQuantities.newCommitments.slice(0, _invoice.length).map(n => n.integer),
					cipherText: [],
					encKeys: [],
				},
				proof,
				BackupData
			)
			.encodeABI();

		let txParams = {
			from: config.web3.options.defaultAccount,
			to: contractAddr,
			gas: config.web3.options.defaultGas,
			gasPrice: config.web3.options.defaultGasPrice,
			data: txData,
			chainId: await web3.eth.net.getId(),
		};

		const key = config.web3.key;

		const signed = await web3.eth.accounts.signTransaction(txParams, key);

		const sendTxn = await web3.eth.sendSignedTransaction(signed.rawTransaction);

		let tx = await instance.getPastEvents("NewLeaves");

		tx = tx[0];

		if (!tx) {
			throw new Error(
				"Tx failed - the commitment was not accepted on-chain, or the contract is not deployed."
			);
		}

		let encEvent = "";

		try {
			encEvent = await instance.getPastEvents("EncryptedData");
		} catch (err) {
			console.log("No encrypted event");
		}

		let encBackupEvent = "";

		try {
			encBackupEvent = await instance.getPastEvents("EncryptedBackupData");
		} catch (err) {
			console.log("No encrypted backup event");
		}

		// Write new commitment preimage to db:

		for (let i = 0; i < _invoice.length; i++) {

			if (orderedQuantities.commitmentExists[i])
				await markNullified(
					orderedQuantities.oldCommitments[i],
					secretKey.hex(32)
				);
			
			if (orderedQuantities.newSalts[i] != 0)
				await storeCommitment({
					hash: orderedQuantities.newCommitments[i],
					name: "orderedQuantities",
					mappingKey: orderedQuantities.skus[i].integer,
					preimage: {
						stateVarId: generalise(
							poseidonHash(
								[
									generalise(orderedQuantities_sku_stateVarId).bigInt,
									generalise(orderedQuantities.skus[i]).bigInt,
								]
							)
						),
						value: orderedQuantities.newValues[i],
						salt: orderedQuantities.newSalts[i],
						publicKey: orderedQuantities_sku_newOwnerPublicKey,
					},
					secretKey:
						orderedQuantities_sku_newOwnerPublicKey.integer === publicKey.integer
							? secretKey
							: null,
					isNullified: false,
				});
		}
	
		return { tx, encEvent, encBackupEvent };
	}
}
