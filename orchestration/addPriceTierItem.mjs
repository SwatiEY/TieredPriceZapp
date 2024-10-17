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

export class AddPriceTierItemManager {
	constructor(web3) {
		this.web3 = web3;
	}

	async init() {
		this.instance = await getContractInstance("TieredPricingShield");
		this.contractAddr = await getContractAddress("TieredPricingShield");
	}

	async addPriceTierItem(
		_sku,
		_priceTierItem,
		_assetPriceTiers_sku_newOwnerPublicKey = 0
	) {
		const instance = this.instance;
		const contractAddr = this.contractAddr;
		const web3 = this.web3;
		const sku = generalise(_sku);
		const priceTierItem = generalise(_priceTierItem);
		let assetPriceTiers_sku_newOwnerPublicKey = generalise(
			_assetPriceTiers_sku_newOwnerPublicKey
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

		let assetPriceTiers_sku_stateVarId_key = 26;

		let assetPriceTiers_sku_stateVarId = poseidonHash([
			BigInt(assetPriceTiers_sku_stateVarId_key),
			BigInt(sku.hex(32)),
		]).hex(32);

		let assetPriceTiers_sku_commitmentExists = true;
		let assetPriceTiers_sku_witnessRequired = true;

		const assetPriceTiers_sku_commitment = await getCurrentWholeCommitment(
			assetPriceTiers_sku_stateVarId
		);

		let assetPriceTiers_sku_preimage = {
			value: Array(9).fill({minQuantity: 0, price: 0}),
			salt: 0,
			commitment: 0,
		};

		if (!assetPriceTiers_sku_commitment) {
			assetPriceTiers_sku_commitmentExists = false;
			assetPriceTiers_sku_witnessRequired = false;
		} else {
			assetPriceTiers_sku_preimage = assetPriceTiers_sku_commitment.preimage;
		}

		// read preimage for whole state
		assetPriceTiers_sku_newOwnerPublicKey =
			_assetPriceTiers_sku_newOwnerPublicKey === 0
				// ? generalise(
				// 		await instance.methods
				// 			.zkpPublicKeys(await instance.methods.seller().call())
				// 			.call()
				//   )
				? publicKey
				: assetPriceTiers_sku_newOwnerPublicKey;

		const assetPriceTiers_sku_currentCommitment =
			assetPriceTiers_sku_commitmentExists
				? generalise(assetPriceTiers_sku_commitment._id)
				: generalise(0);
		const assetPriceTiers_sku_prev = generalise(
			assetPriceTiers_sku_preimage.value
		);
		const assetPriceTiers_sku_prevSalt = generalise(
			assetPriceTiers_sku_preimage.salt
		);

		// non-secret line would go here but has been filtered out

		let assetPriceTiers_sku = priceTierItem;

		// Extract set membership witness:

		// generate witness for whole state
		const assetPriceTiers_sku_emptyPath = new Array(32).fill(0);
		const assetPriceTiers_sku_witness = assetPriceTiers_sku_witnessRequired
			? await getMembershipWitness(
					"TieredPricingShield",
					assetPriceTiers_sku_currentCommitment.integer
			  )
			: {
					index: 0,
					path: assetPriceTiers_sku_emptyPath,
					root: (await getRoot("TieredPricingShield")) || 0,
			  };
		const assetPriceTiers_sku_index = generalise(
			assetPriceTiers_sku_witness.index
		);
		const assetPriceTiers_sku_root = generalise(
			assetPriceTiers_sku_witness.root
		);
		const assetPriceTiers_sku_path = generalise(
			assetPriceTiers_sku_witness.path
		).all;

		// Calculate nullifier(s):

		let assetPriceTiers_sku_nullifier = assetPriceTiers_sku_commitmentExists
			? poseidonHash([
					BigInt(assetPriceTiers_sku_stateVarId),
					BigInt(secretKey.hex(32)),
					BigInt(assetPriceTiers_sku_prevSalt.hex(32)),
			  ])
			: poseidonHash([
					BigInt(assetPriceTiers_sku_stateVarId),
					BigInt(generalise(0).hex(32)),
					BigInt(assetPriceTiers_sku_prevSalt.hex(32)),
			  ]);

		assetPriceTiers_sku_nullifier = generalise(
			assetPriceTiers_sku_nullifier.hex(32)
		); // truncate

		// Calculate commitment(s):

		const assetPriceTiers_sku_newSalt = generalise(utils.randomHex(31));

		let assetPriceTiers_sku_newCommitment_value;

	assetPriceTiers_sku.forEach((tier, i) => {
		const innerValue = poseidonHash(
			[BigInt(tier.minQuantity.hex(32)), BigInt(tier.price.hex(32))]
		);
		if (i === 0) {
			assetPriceTiers_sku_newCommitment_value = innerValue;
		} else {
			assetPriceTiers_sku_newCommitment_value = poseidonHash([assetPriceTiers_sku_newCommitment_value.bigInt, innerValue.bigInt]);
		}
	});

		let assetPriceTiers_sku_newCommitment = poseidonHash([
			BigInt(assetPriceTiers_sku_stateVarId),
			BigInt(assetPriceTiers_sku_newCommitment_value.hex(32)),
			BigInt(assetPriceTiers_sku_newOwnerPublicKey.hex(32)),
			BigInt(assetPriceTiers_sku_newSalt.hex(32)),
		]);

		assetPriceTiers_sku_newCommitment = generalise(
			assetPriceTiers_sku_newCommitment.hex(32)
		); // truncate

	if (priceTierItem.length < 9) priceTierItem.push(...Array(9 - priceTierItem.length).fill({minQuantity: generalise(0), price: generalise(0)}));
	if (assetPriceTiers_sku_prev.length < 9) assetPriceTiers_sku_prev.push(...Array(9 - assetPriceTiers_sku_prev.length).fill({minQuantity: generalise(0), price: generalise(0)}));


		// Call Zokrates to generate the proof:

		const allInputs = [
			sku.integer,
			priceTierItem.map(tier => [tier.minQuantity.integer, tier.price.integer]),
			assetPriceTiers_sku_commitmentExists
				? secretKey.integer
				: generalise(0).integer,
			assetPriceTiers_sku_nullifier.integer,

			assetPriceTiers_sku_prev.map(tier => [tier.minQuantity.integer, tier.price.integer]),
			assetPriceTiers_sku_prevSalt.integer,
			assetPriceTiers_sku_commitmentExists ? 0 : 1,
			assetPriceTiers_sku_root.integer,
			assetPriceTiers_sku_index.integer,
			assetPriceTiers_sku_path.integer,
			assetPriceTiers_sku_newOwnerPublicKey.integer,
			assetPriceTiers_sku_newSalt.integer,
			assetPriceTiers_sku_newCommitment.integer,
		].flat(Infinity);

		console.log(allInputs.join(' '));
		const res = await generateProof("addPriceTierItem", allInputs);
		const proof = generalise(Object.values(res.proof).flat(Infinity))
			.map((coeff) => coeff.integer)
			.flat(Infinity);

		let BackupData = [];

		// Encrypt pre-image for state variable assetPriceTiers_sku as a backup:

		const assetPriceTiers_sku_bcipherText = encrypt(
			[
				BigInt(assetPriceTiers_sku_newSalt.hex(32)),
				BigInt(generalise(sku).hex(32)),
				BigInt(generalise(assetPriceTiers_sku_stateVarId_key).hex(32)),
				...assetPriceTiers_sku.slice(0, _priceTierItem.length).flatMap(tier => [generalise(tier.minQuantity).hex(32), generalise(tier.price).hex(32)])
			],
			masterZkpSecretKey.hex(32),
			[
				decompressStarlightKey(masterZkpPublicKey)[0].hex(32),
				decompressStarlightKey(masterZkpPublicKey)[1].hex(32),
			].hex(32),
		);

		let assetPriceTiers_sku_cipherText_combined = {
			varName: "assetPriceTiers a s u",
			cipherText: assetPriceTiers_sku_bcipherText,
			ephPublicKey: masterZkpPublicKey.hex(32),
		};

		BackupData.push(assetPriceTiers_sku_cipherText_combined);

		// Send transaction to the blockchain:

		const txData = await instance.methods
			.addPriceTierItem(
				{
					customInputs: [1],
					newNullifiers: [assetPriceTiers_sku_nullifier.integer],
					commitmentRoot: assetPriceTiers_sku_root.integer,
					checkNullifiers: [],
					newCommitments: [assetPriceTiers_sku_newCommitment.integer],
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

		if (assetPriceTiers_sku_commitmentExists)
			await markNullified(
				assetPriceTiers_sku_currentCommitment,
				secretKey.hex(32)
			);

		await storeCommitment({
			hash: assetPriceTiers_sku_newCommitment,
			name: "assetPriceTiers",
			mappingKey: sku.integer,
			preimage: {
				stateVarId: generalise(assetPriceTiers_sku_stateVarId),
				value: assetPriceTiers_sku.slice(0, _priceTierItem.length),
				salt: assetPriceTiers_sku_newSalt,
				publicKey: assetPriceTiers_sku_newOwnerPublicKey,
			},
			secretKey:
				assetPriceTiers_sku_newOwnerPublicKey.integer === publicKey.integer
					? secretKey
					: null,
			isNullified: false,
		});

		return { tx, encEvent, encBackupEvent };
	}
}
