/* eslint-disable prettier/prettier, camelcase, prefer-const, no-unused-vars */
import config from "config";
import utils from "zkp-utils";
import GN from "general-number";
import fs, { stat } from "fs";
import mongo from "./common/mongo.mjs";

import {
	storeCommitment,
	markNullified,
	deleteCommitmentsByState,
} from "./common/commitment-storage.mjs";

import { getContractInstance, getContractAddress } from "./common/contract.mjs";

import Web3 from "./common/web3.mjs";
import {
	decompressStarlightKey,
	compressStarlightKey,
	encrypt,
	decrypt,
	poseidonHash,
	scalarMult,
} from "./common/number-theory.mjs";

const { generalise } = GN;
const web3 = Web3.connection();
const keyDb = "/app/orchestration/common/db/key.json";
const { MONGO_URL, COMMITMENTS_DB, COMMITMENTS_COLLECTION } = config;

export async function backupVariable(_name) {
	let requestedName = _name;

	deleteCommitmentsByState(requestedName, null);

	const instance = await getContractInstance("TieredPricingShield");

	const backDataEvent = await instance.getPastEvents("EncryptedBackupData", {
		fromBlock: 0,
		toBlock: "latest",
	});

	const keys = JSON.parse(
		fs.readFileSync(keyDb, "utf-8", (err) => {
			console.log(err);
		})
	);
	const secretKey = generalise(keys.secretKey);
	const publicKey = generalise(keys.publicKey);
	let storedCommitments = [];
	for (const log of backDataEvent) {
		for (let i = 0; i < log.returnValues.encPreimages.length; i++) {
			let cipherText = log.returnValues.encPreimages[i].cipherText;
			let ephPublicKey = log.returnValues.encPreimages[i].ephPublicKey;
			let varName = log.returnValues.encPreimages[i].varName;
			let name = varName.replace(" a", "").replace(" s", "").replace(" u", "");
			if (requestedName !== name) {
				continue;
			}
			let isArray = false;
			let isStruct = false;
			let isMappingofArrayofStructs = false;
			if (varName.includes(" a")) {
				isArray = true;
			} else if (varName.includes(" s")) {
				isStruct = true;
			}
			if (varName.includes(" a") && varName.includes(" s") && varName.includes(" u")) {
				isStruct = false;
                isMappingofArrayofStructs = true;
			}
			const plainText = decrypt(cipherText, secretKey.hex(32), [
				decompressStarlightKey(generalise(ephPublicKey))[0].hex(32),
				decompressStarlightKey(generalise(ephPublicKey))[1].hex(32),
			]);
			let mappingKey = null;
			let stateVarId;
			let value;
			console.log(
				"Decrypted pre-image of commitment for variable name: " + name + ": "
			);
			let salt = generalise(plainText[0]);
			console.log(`\tSalt: ${salt.integer}`);
			if (isArray) {
				console.log(`\tState variable StateVarId: ${plainText[2]}`);
				mappingKey = generalise(plainText[1]);
				console.log(`\tMapping Key: ${mappingKey.integer}`);
				let reGenStateVarId = 
					poseidonHash([BigInt(plainText[2]), BigInt(mappingKey.hex(32))]).hex(32);
				stateVarId = reGenStateVarId;
				console.log(`Regenerated StateVarId: ${reGenStateVarId}`);
				console.log(`plainText:`, plainText);
				value = generalise(plainText[3]);
				console.log(`\tValue: ${value.integer}`);
				if (isMappingofArrayofStructs) {
					value = [];
					let structValue = {};
					if(generalise(plainText[2]).integer === '26' ) {
						for(let i = 3; i < plainText.length; i+=2) {
						structValue = {minQuantity: plainText[i], price: plainText[i+1]};
						value.push(structValue);
					}
				} 
				if(generalise(plainText[2]).integer === '50' ) {
					for(let i = 3; i < plainText.length; i+=3) {
					structValue = {sku: plainText[i], quantity: plainText[i+1], subTotal: plainText[i+2]};
					value.push(structValue);
				}
			} 
			}
			} else {
				stateVarId = generalise(plainText[1]);
				console.log(`\tStateVarId: ${plainText[1]}`);
				if (isStruct) {
					value = {};
					console.log(`\tValue: ${value}`);
				} else {
					value = generalise(plainText[2]);
					console.log(`\tValue: ${value.integer}`);
				}
			}
			let newCommitment;
			if (isStruct) {
				let hashInput = [BigInt(stateVarId.hex(32))];
				for (let i = 2; i < plainText.length; i++) {
					hashInput.push(BigInt(generalise(plainText[i]).hex(32)));
				}
				hashInput.push(BigInt(publicKey.hex(32)));
				hashInput.push(BigInt(salt.hex(32)));
				newCommitment = generalise(poseidonHash(hashInput));
			} else if (isMappingofArrayofStructs) {
				console.log('here 2');
				let hashInput = [BigInt(stateVarId)];
				let newCommitment_value;
				if(generalise(plainText[2]).integer === '26') {
					value = generalise(value);
				value.forEach((tier, i) => {
					const innerValue = poseidonHash(
						[BigInt(tier.minQuantity.hex(32)), BigInt(tier.price.hex(32))]
					);
					if (i === 0) {
						newCommitment_value = innerValue;
					} else {
						newCommitment_value = poseidonHash([newCommitment_value.bigInt, innerValue.bigInt]);
					}
				});
			}   
			if(generalise(plainText[2]).integer === '50') {
				value = generalise(value);
			value.forEach((purchaseOrder, i) => {
				const innerValue = poseidonHash(
					[BigInt(purchaseOrder.sku.hex(32)), BigInt(purchaseOrder.quantity.hex(32)), BigInt(purchaseOrder.subTotal.hex(32))]
				);
				if (i === 0) {
					newCommitment_value = innerValue;
				} else {
					newCommitment_value = poseidonHash([newCommitment_value.bigInt, innerValue.bigInt]);
				}
			});
		}   
			    hashInput.push(BigInt(newCommitment_value.hex(32)));
				hashInput.push(BigInt(publicKey.hex(32)));
				hashInput.push(BigInt(salt.hex(32)));
				newCommitment = generalise(poseidonHash(hashInput));
				stateVarId = generalise(stateVarId);
			}
			else {
				console.log(stateVarId)
				newCommitment = generalise(
					poseidonHash([
						BigInt(stateVarId),
						BigInt(value.hex(32)),
						BigInt(publicKey.hex(32)),
						BigInt(salt.hex(32)),
					])
				);
				stateVarId = generalise(stateVarId);
			}
			if (!varName.includes(" u")) {
				let oldCommitments = storedCommitments.filter(
					(element) =>
						element.stateVarId.integer === stateVarId.integer &&
						(!mappingKey || element.mappingKey === mappingKey?.integer)
				);
				for (const oldCommitment of oldCommitments) {
					await markNullified(oldCommitment.hash, secretKey.hex(32));
					let index = storedCommitments.findIndex(
						(element) => element === oldCommitment
					);
					if (index !== -1) {
						storedCommitments.splice(index, 1);
					}
				}
			}
			await storeCommitment({
				hash: newCommitment,
				name: name,
				mappingKey: mappingKey?.integer,
				preimage: {
					stateVarId: stateVarId,
					value: value,
					salt: salt,
					publicKey: publicKey,
				},
				secretKey: secretKey,
				isNullified: false,
			});
			storedCommitments.push({
				stateVarId: stateVarId,
				hash: newCommitment,
				mappingKey: mappingKey?.integer,
			});
		}
	}
}
