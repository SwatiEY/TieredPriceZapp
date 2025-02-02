/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from "config";
import assert from "assert";

import { CheckInvoiceManager } from "./checkInvoice.mjs";
import { CheckPOManager } from "./checkPO.mjs";
import { AddSellerManager } from "./addSeller.mjs";
import { AddBuyersManager } from "./addBuyers.mjs";
import { AddPriceTierItemManager } from "./addPriceTierItem.mjs";
import { startEventFilter, getSiblingPath } from "./common/timber.mjs";
import fs from "fs";
import logger from "./common/logger.mjs";
import { decrypt } from "./common/number-theory.mjs";
import {
	getAllCommitments,
	getCommitmentsByState,
	reinstateNullifiers,
	getBalance,
	getSharedSecretskeys,
	getBalanceByState,
	addConstructorNullifiers,
} from "./common/commitment-storage.mjs";
import { backupDataRetriever } from "./BackupDataRetriever.mjs";
import { backupVariable } from "./BackupVariable.mjs";
import web3 from "./common/web3.mjs";

/**
      NOTE: this is the api service file, if you need to call any function use the correct url and if Your input contract has two functions, add() and minus().
      minus() cannot be called before an initial add(). */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let leafIndex;
let encryption = {};
// eslint-disable-next-line func-names

export class ServiceManager {
	constructor(web3) {
		this.web3 = web3;

		this.addPriceTierItem = new AddPriceTierItemManager(web3);
		this.addSeller = new AddSellerManager(web3);
		this.addBuyers = new AddBuyersManager(web3);
		this.checkPO = new CheckPOManager(web3);
		this.checkInvoice = new CheckInvoiceManager(web3);
	}
	async init() {
		await this.addPriceTierItem.init();
		await this.addSeller.init();
		await this.addBuyers.init();
		await this.checkPO.init();
		await this.checkInvoice.init();
	}

	// eslint-disable-next-line func-names
	async service_addPriceTierItem(req, res, next) {
		try {
			await startEventFilter("TieredPricingShield");
			const { sku } = req.body;
			const { priceTierItem } = req.body;
			const assetPriceTiers_sku_newOwnerPublicKey =
				req.body.assetPriceTiers_sku_newOwnerPublicKey || 0;
			const { tx, encEvent, encBackupEvent } =
				await this.addPriceTierItem.addPriceTierItem(
					sku,
					priceTierItem,
					assetPriceTiers_sku_newOwnerPublicKey
				);
			// prints the tx
			console.log(tx);
			res.send({ tx, encEvent, encBackupEvent });
			// reassigns leafIndex to the index of the first commitment added by this function
			if (tx.event) {
				leafIndex = tx.returnValues[0];
				// prints the new leaves (commitments) added by this function call
				console.log(`Merkle tree event returnValues:`);
				console.log(tx.returnValues);
			}
			if (encEvent.event) {
				encryption.msgs = encEvent[0].returnValues[0];
				encryption.key = encEvent[0].returnValues[1];
				console.log("EncryptedMsgs:");
				console.log(encEvent[0].returnValues[0]);
			}
			await sleep(10);
		} catch (err) {
			logger.error(err);
			res.send({ errors: [err.message] });
		}
	}

	// eslint-disable-next-line func-names
	async service_addSeller(req, res, next) {
		const { _seller } = req.body;
		const { tx } = await this.addSeller.addSeller(_seller);
		// prints the tx
		console.log(tx);
		res.send({ tx });

		if (tx.event) {
			console.log(tx.returnValues);
		}
	}


	// eslint-disable-next-line func-names
	async service_addBuyers(req, res, next) {
		const { _buyers } = req.body;
		const { tx } = await this.addBuyers.addBuyers(_buyers);
		// prints the tx
		console.log(tx);
		res.send({ tx });

		if (tx.event) {
			console.log(tx.returnValues);
		}
	}

	// eslint-disable-next-line func-names
	async service_checkPO(req, res, next) {
		try {
			await startEventFilter("TieredPricingShield");
			const { order } = req.body;
			const { purchaseOrderId } = req.body;
			const purchaseOrder_purchaseOrderId_index_newOwnerPublicKey =
				req.body.purchaseOrder_purchaseOrderId_index_newOwnerPublicKey || 0;
			const { tx, encEvent, encBackupEvent } = await this.checkPO.checkPO(
				order,
				purchaseOrderId,
				purchaseOrder_purchaseOrderId_index_newOwnerPublicKey
			);
			// prints the tx
			console.log(tx);
			res.send({ tx, encEvent, encBackupEvent });
			// reassigns leafIndex to the index of the first commitment added by this function
			if (tx.event) {
				leafIndex = tx.returnValues[0];
				// prints the new leaves (commitments) added by this function call
				console.log(`Merkle tree event returnValues:`);
				console.log(tx.returnValues);
			}
			if (encEvent.event) {
				encryption.msgs = encEvent[0].returnValues[0];
				encryption.key = encEvent[0].returnValues[1];
				console.log("EncryptedMsgs:");
				console.log(encEvent[0].returnValues[0]);
			}
			await sleep(10);
		} catch (err) {
			logger.error(err);
			res.send({ errors: [err.message] });
		}
	}

	// eslint-disable-next-line func-names
	async service_checkInvoice(req, res, next) {
		try {
			await startEventFilter("TieredPricingShield");
			const { invoice } = req.body;
			const { purchaseOrderId } = req.body;
			const orderedQuantities_sku_newOwnerPublicKey =
				req.body.orderedQuantities_sku_newOwnerPublicKey || 0;
			const { tx, encEvent, encBackupEvent } =
				await this.checkInvoice.checkInvoice(
					invoice,
					purchaseOrderId,
					orderedQuantities_sku_newOwnerPublicKey
				);
			// prints the tx
			console.log(tx);
			res.send({ tx, encEvent, encBackupEvent });
			// reassigns leafIndex to the index of the first commitment added by this function
			if (tx.event) {
				leafIndex = tx.returnValues[0];
				// prints the new leaves (commitments) added by this function call
				console.log(`Merkle tree event returnValues:`);
				console.log(tx.returnValues);
			}
			if (encEvent.event) {
				encryption.msgs = encEvent[0].returnValues[0];
				encryption.key = encEvent[0].returnValues[1];
				console.log("EncryptedMsgs:");
				console.log(encEvent[0].returnValues[0]);
			}
			await sleep(10);
		} catch (err) {
			logger.error(err);
			res.send({ errors: [err.message] });
		}
	}
}

export async function service_allCommitments(req, res, next) {
	try {
		const commitments = await getAllCommitments();
		res.send({ commitments });
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}
export async function service_getBalance(req, res, next) {
	try {
		const sum = await getBalance();
		res.send({ " Total Balance": sum });
	} catch (error) {
		console.error("Error in calculation :", error);
		res.status(500).send({ error: err.message });
	}
}

export async function service_getBalanceByState(req, res, next) {
	try {
		const { name, mappingKey } = req.body;
		const balance = await getBalanceByState(name, mappingKey);
		res.send({ " Total Balance": balance });
	} catch (error) {
		console.error("Error in calculation :", error);
		res.status(500).send({ error: err.message });
	}
}

export async function service_getCommitmentsByState(req, res, next) {
	try {
		const { name, mappingKey } = req.body;
		const commitments = await getCommitmentsByState(name, mappingKey);
		res.send({ commitments });
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}

export async function service_reinstateNullifiers(req, res, next) {
	try {
		await reinstateNullifiers();
		res.send("Complete");
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}

export async function service_backupData(req, res, next) {
	try {
		await backupDataRetriever();
		res.send("Complete");
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}
export async function service_backupVariable(req, res, next) {
	try {
		const { name } = req.body;
		await backupVariable(name);
		res.send("Complete");
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}
export async function service_getSharedKeys(req, res, next) {
	try {
		const { recipientAddress } = req.body;
		const recipientPubKey = req.body.recipientPubKey || 0;
		const SharedKeys = await getSharedSecretskeys(
			recipientAddress,
			recipientPubKey
		);
		res.send({ SharedKeys });
		await sleep(10);
	} catch (err) {
		logger.error(err);
		res.send({ errors: [err.message] });
	}
}
