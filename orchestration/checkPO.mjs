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
import getAssetPriceTiersCommitment from "./getAssetPriceTier.mjs"
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

export class CheckPOManager {
	constructor(web3) {
		this.web3 = web3;
	}

	async init() {
		this.instance = await getContractInstance("TieredPricingShield");
		this.contractAddr = await getContractAddress("TieredPricingShield");
	}

	async checkPO(
		_order,
		_purchaseOrderId,
		_purchaseOrder_purchaseOrderId_newOwnerPublicKey = 0
	) {
		const instance = this.instance;
		const contractAddr = this.contractAddr;
		const web3 = this.web3;
		console.log(_order);
		const order = generalise(_order);
		const purchaseOrderId = generalise(_purchaseOrderId);
		let purchaseOrder_purchaseOrderId_newOwnerPublicKey = generalise(
			_purchaseOrder_purchaseOrderId_newOwnerPublicKey
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

		// Initialise commitment preimage of whole accessed state:

		let assetPriceTiers_sku_stateVarId = 26;

		// Initialise commitment preimage of whole state:

		let purchaseOrder_purchaseOrderId_stateVarId_key = 50;

		let purchaseOrder_purchaseOrderId_stateVarId = poseidonHash([
			BigInt(purchaseOrder_purchaseOrderId_stateVarId_key),
			BigInt(purchaseOrderId.hex(32)),
		]).hex(32);

		let purchaseOrder_purchaseOrderId_commitmentExists = true;
		let purchaseOrder_purchaseOrderId_witnessRequired = true;

		const purchaseOrder_purchaseOrderId_commitment =
			await getCurrentWholeCommitment(
				purchaseOrder_purchaseOrderId_stateVarId
			);

		let purchaseOrder_purchaseOrderId_preimage = {
		    value: Array(order.length).fill({sku: 0, quantity: 0, subTotal: 0}),
			salt: 0,
			commitment: 0,
		};
		if (!purchaseOrder_purchaseOrderId_commitment) {
			purchaseOrder_purchaseOrderId_commitmentExists = false;
			purchaseOrder_purchaseOrderId_witnessRequired = false;
		} else {
			purchaseOrder_purchaseOrderId_preimage =
				purchaseOrder_purchaseOrderId_commitment.preimage;
		}

		// read preimage for whole state
		purchaseOrder_purchaseOrderId_newOwnerPublicKey =
			_purchaseOrder_purchaseOrderId_newOwnerPublicKey === 0
				// ? generalise(
				// 		await instance.methods
				// 			.zkpPublicKeys(await instance.methods.seller().call())
				// 			.call()
				//   )
				? publicKey
				: purchaseOrder_purchaseOrderId_newOwnerPublicKey;

		const purchaseOrder_purchaseOrderId_currentCommitment =
			purchaseOrder_purchaseOrderId_commitmentExists
				? generalise(purchaseOrder_purchaseOrderId_commitment._id)
				: generalise(0);
		const purchaseOrder_purchaseOrderId_prev = generalise(
			purchaseOrder_purchaseOrderId_preimage.value
		);
		const purchaseOrder_purchaseOrderId_prevSalt = generalise(
			purchaseOrder_purchaseOrderId_preimage.salt
		);

		let purchaseOrder_purchaseOrderId = generalise(
			purchaseOrder_purchaseOrderId_preimage.value
		);

		let assetPriceTiers = {
			skus: Array(9).fill(generalise(0)),
			prevValues: Array(9).fill(Array(9).fill({minQuantity: generalise(0), price: generalise(0)})),
			salts: Array(9).fill(generalise(0)),
			indices: Array(9).fill(generalise(0)),
			paths: Array(9).fill(generalise(Array(32).fill(0)).all),
			nullifiers: Array(9).fill(generalise(0))
		};
	


		// non-secret line would go here but has been filtered out

		for (let index = 0; index < order.length; index++) {
			if (!(parseInt(order[index].quantity.integer, 10) > 0)) {
				throw new Error(
					"Require statement not satisfied: Quantity should be greater than zero"
				);
			}
			let sku = generalise(parseInt(order[index].sku.integer, 10));

			let assetPriceTiers_sku = await getAssetPriceTiersCommitment(sku, index, assetPriceTiers)

			console.log(assetPriceTiers_sku);

			 let tier = assetPriceTiers_sku;
			tier.forEach((t) => {
				if (!(parseInt(t.price.integer, 10) != 0) && (parseInt(t.minQuantity.integer, 10) != 0) ) {
					throw new Error(
						"Require statement not satisfied: Price tier does not exists in the contract"
					);
				}
			})

			
			purchaseOrder_purchaseOrderId[index] = generalise(order[index]);

		}

		// Extract set membership witness:

		// generate witness for whole state
		const purchaseOrder_purchaseOrderId_emptyPath = new Array(32).fill(0);
		const purchaseOrder_purchaseOrderId_witness =
			purchaseOrder_purchaseOrderId_witnessRequired
				? await getMembershipWitness(
						"TieredPricingShield",
						purchaseOrder_purchaseOrderId_currentCommitment.integer
				  )
				: {
						index: 0,
						path: purchaseOrder_purchaseOrderId_emptyPath,
						root: (await getRoot("TieredPricingShield")) || 0,
				  };
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
		const purchaseOrder_purchaseOrderId_newSalt = generalise(utils.randomHex(31));

		let purchaseOrder_purchaseOrderId_newCommitment_value;

		console.log(purchaseOrder_purchaseOrderId);

		purchaseOrder_purchaseOrderId.forEach((purchaseOrder, i) => {
			const innerValue = poseidonHash(
				[BigInt(purchaseOrder.sku.hex(32)), BigInt(purchaseOrder.quantity.hex(32)), BigInt(purchaseOrder.subTotal.hex(32))]
			);
			if (i === 0) {
				purchaseOrder_purchaseOrderId_newCommitment_value = innerValue;
			} else {
				purchaseOrder_purchaseOrderId_newCommitment_value = poseidonHash([purchaseOrder_purchaseOrderId_newCommitment_value.bigInt, innerValue.bigInt]);
			}
		});

		console.log(purchaseOrder_purchaseOrderId_newCommitment_value);

		let purchaseOrder_purchaseOrderId_newCommitment = poseidonHash([
			BigInt(purchaseOrder_purchaseOrderId_stateVarId),
			BigInt(purchaseOrder_purchaseOrderId_newCommitment_value.hex(32)),
			BigInt(purchaseOrder_purchaseOrderId_newOwnerPublicKey.hex(32)),
			BigInt(purchaseOrder_purchaseOrderId_newSalt.hex(32)),
		]);

		purchaseOrder_purchaseOrderId_newCommitment = generalise(
			purchaseOrder_purchaseOrderId_newCommitment.hex(32)
		); // truncate

		if (order.length < 9) order.push(...Array(9 - order.length).fill({sku: generalise(0), quantity: generalise(0), subTotal: generalise(0)}));
		if (purchaseOrder_purchaseOrderId_prev.length < 9) purchaseOrder_purchaseOrderId_prev.push(...Array(9 - purchaseOrder_purchaseOrderId_prev.length).fill({sku: generalise(0), quantity: generalise(0), subTotal: generalise(0)}));
	
		// Call Zokrates to generate the proof:
	

		const allInputs = [
			order.map(orderLine => [orderLine.sku.integer, orderLine.quantity.integer, orderLine.subTotal.integer]),
			purchaseOrderId.integer,
			secretKey.integer,
			assetPriceTiers.nullifiers.map(n => n.integer),
			assetPriceTiers.prevValues.map(tiers => tiers.map(tier => [tier.minQuantity.integer, tier.price.integer])),
			assetPriceTiers.salts.map(s => s.integer),
			purchaseOrder_purchaseOrderId_root.integer,
			assetPriceTiers.indices.map(i => i.integer),
		    assetPriceTiers.paths.map(p => p.integer),

			purchaseOrder_purchaseOrderId_commitmentExists
				? secretKey.integer
				: generalise(0).integer,
			purchaseOrder_purchaseOrderId_nullifier.integer,

			purchaseOrder_purchaseOrderId_prev.map(orderLine => [orderLine.sku.integer, orderLine.quantity.integer, orderLine.subTotal.integer]),
			purchaseOrder_purchaseOrderId_prevSalt.integer,

			purchaseOrder_purchaseOrderId_index.integer,
			purchaseOrder_purchaseOrderId_path.integer,
			purchaseOrder_purchaseOrderId_newOwnerPublicKey.integer,
			purchaseOrder_purchaseOrderId_newSalt.integer,
			purchaseOrder_purchaseOrderId_newCommitment.integer,
		].flat(Infinity);

		console.log(allInputs.join(' '));
		const res = await generateProof("checkPO", allInputs);
		const proof = generalise(Object.values(res.proof).flat(Infinity))
			.map((coeff) => coeff.integer)
			.flat(Infinity);

		let BackupData = [];

		// Encrypt pre-image for state variable purchaseOrder_purchaseOrderId as a backup:

		let purchaseOrder_purchaseOrderId_ephSecretKey = generalise(utils.randomHex(31));

		let purchaseOrder_purchaseOrderId_ephPublicKeyPoint = generalise(
			scalarMult(
				purchaseOrder_purchaseOrderId_ephSecretKey.hex(32),
				config.BABYJUBJUB.GENERATOR
			)
		);

		let purchaseOrder_purchaseOrderId_ephPublicKey = compressStarlightKey(
			purchaseOrder_purchaseOrderId_ephPublicKeyPoint
		);

		while (purchaseOrder_purchaseOrderId_ephPublicKey === null) {
			purchaseOrder_purchaseOrderId_ephSecretKey = generalise(utils.randomHex(31));

			purchaseOrder_purchaseOrderId_ephPublicKeyPoint = generalise(
				scalarMult(
					purchaseOrder_purchaseOrderId_ephSecretKey.hex(32),
					config.BABYJUBJUB.GENERATOR
				)
			);

			purchaseOrder_purchaseOrderId_ephPublicKey = compressStarlightKey(
				purchaseOrder_purchaseOrderId_ephPublicKeyPoint
			);
		}

		const purchaseOrder_purchaseOrderId_bcipherText = encrypt(
			[
				BigInt(purchaseOrder_purchaseOrderId_newSalt.hex(32)),
				BigInt(generalise(purchaseOrderId).hex(32)),
				BigInt(generalise(purchaseOrder_purchaseOrderId_stateVarId_key).hex(32)),
				...purchaseOrder_purchaseOrderId.slice(0, _order.length).flatMap(orderLine => [orderLine.sku.integer, orderLine.quantity.integer, orderLine.subTotal.integer])
			],
			purchaseOrder_purchaseOrderId_ephSecretKey.hex(32),
			[
				decompressStarlightKey(purchaseOrder_purchaseOrderId_newOwnerPublicKey)[0].hex(
					32
				),
				decompressStarlightKey(purchaseOrder_purchaseOrderId_newOwnerPublicKey)[1].hex(
					32
				),
			]
		);

		let purchaseOrder_purchaseOrderId_cipherText_combined = {
			varName: "purchaseOrder a s u",
			cipherText: purchaseOrder_purchaseOrderId_bcipherText,
			ephPublicKey: purchaseOrder_purchaseOrderId_ephPublicKey.hex(32),
		};

		BackupData.push(purchaseOrder_purchaseOrderId_cipherText_combined);




		// Send transaction to the blockchain:

		const txData = await instance.methods
			.checkPO(
				{
					customInputs: [1],
					newNullifiers: [
						purchaseOrder_purchaseOrderId_nullifier.integer,
					],
					commitmentRoot: purchaseOrder_purchaseOrderId_root.integer,
					checkNullifiers: assetPriceTiers.nullifiers.map(n => n.integer),
					newCommitments: [
						purchaseOrder_purchaseOrderId_newCommitment.integer,
					],
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

		if (purchaseOrder_purchaseOrderId_commitmentExists)
			await markNullified(
				purchaseOrder_purchaseOrderId_currentCommitment,
				secretKey.hex(32)
			);

		await storeCommitment({
			hash: purchaseOrder_purchaseOrderId_newCommitment,
			name: "purchaseOrder",
			mappingKey: purchaseOrderId.integer,
			preimage: {
				stateVarId: generalise(purchaseOrder_purchaseOrderId_stateVarId),
				value: purchaseOrder_purchaseOrderId.slice(0, _order.length),
				salt: purchaseOrder_purchaseOrderId_newSalt,
				publicKey: purchaseOrder_purchaseOrderId_newOwnerPublicKey,
			},
			secretKey:
				purchaseOrder_purchaseOrderId_newOwnerPublicKey.integer ===
				publicKey.integer
					? secretKey
					: null,
			isNullified: false,
		});

		return { tx, encEvent, encBackupEvent };
	}
}
