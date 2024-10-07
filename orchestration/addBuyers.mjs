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

export class AddBuyersManager {
	constructor(web3) {
		this.web3 = web3;
	}

	async init() {
		this.instance = await getContractInstance("TieredPricingShield");
		this.contractAddr = await getContractAddress("TieredPricingShield");
	}

	async addBuyers(_buyers) {
		const instance = this.instance;
		const contractAddr = this.contractAddr;
		const web3 = this.web3;
		// non-secret line would go here but has been filtered out

		// non-secret line would go here but has been filtered out

		// Send transaction to the blockchain:

        console.log(_buyers);

		const txData = await instance.methods
			.addBuyers(_buyers)
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

		const tx = await web3.eth.sendSignedTransaction(signed.rawTransaction);

		const encEvent = {};

		const encBackupEvent = {};

		return { tx, encEvent, encBackupEvent };
	}
}
