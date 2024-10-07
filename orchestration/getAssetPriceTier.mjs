import GN from "general-number";
import utils from "zkp-utils";
import fs from "fs";
import { getCurrentWholeCommitment } from "./common/commitment-storage.mjs";
import { getMembershipWitness } from "./common/timber.mjs";
import { poseidonHash } from "./common/number-theory.mjs";

const { generalise } = GN;
const keyDb = "/app/orchestration/common/db/key.json";

export default async function getAssetPriceTiersCommitment(sku, index, assetPriceTiers_obj) {

        const keys = JSON.parse(
            fs.readFileSync(keyDb, "utf-8", (err) => {
                console.log(err);
            })
        );
        const secretKey = generalise(keys.secretKey);

        let assetPriceTiers_sku_stateVarId = 26;

		const assetPriceTiers_sku_stateVarId_key = generalise(sku);

		const assetPriceTiers_sku_stateVarId_hash = generalise(
			poseidonHash(
				[
					generalise(assetPriceTiers_sku_stateVarId).bigInt,
					assetPriceTiers_sku_stateVarId_key.bigInt,
				]
			)
		).hex(32);
	
		const assetPriceTiers_sku_commitment = await getCurrentWholeCommitment(
			assetPriceTiers_sku_stateVarId_hash
		);
	
		const assetPriceTiers_sku_preimage = assetPriceTiers_sku_commitment.preimage;
	
		// const assetPriceTiers_sku = generalise(assetPriceTiers_sku_preimage.value);

			// read preimage for accessed state

		const assetPriceTiers_sku_currentCommitment = generalise(
			assetPriceTiers_sku_commitment._id
		);
		const assetPriceTiers_sku_prev = generalise(
			assetPriceTiers_sku_preimage.value
		);
		const assetPriceTiers_sku_prevSalt = generalise(
			assetPriceTiers_sku_preimage.salt
		);


		// Extract set membership witness:

		// generate witness for whole accessed state
		const assetPriceTiers_sku_witness = await getMembershipWitness(
			"TieredPricingShield",
			assetPriceTiers_sku_currentCommitment.integer,
		);
		const assetPriceTiers_sku_index = generalise(
			assetPriceTiers_sku_witness.index
		);
		const assetPriceTiers_sku_path = generalise(assetPriceTiers_sku_witness.path)
			.all;

		// Calculate nullifier(s):

		let assetPriceTiers_sku_nullifier = poseidonHash([
				BigInt(assetPriceTiers_sku_stateVarId_hash),
				BigInt(secretKey.hex(32)),
				BigInt(assetPriceTiers_sku_prevSalt.hex(32)),
		]);

		assetPriceTiers_obj.skus[index] = generalise(sku);
		assetPriceTiers_obj.prevValues[index] = assetPriceTiers_sku_prev;
		assetPriceTiers_obj.salts[index] = assetPriceTiers_sku_prevSalt;
		assetPriceTiers_obj.indices[index] = assetPriceTiers_sku_index;
		assetPriceTiers_obj.paths[index] = assetPriceTiers_sku_path;
		assetPriceTiers_obj.nullifiers[index] = assetPriceTiers_sku_nullifier;

		if (assetPriceTiers_obj.prevValues[index].length < 9)
		assetPriceTiers_obj.prevValues[index].push(...Array(9 - assetPriceTiers_obj.prevValues[index].length).fill({minQuantity: generalise(0), price: generalise(0)}));

		return assetPriceTiers_sku_prev;
	}