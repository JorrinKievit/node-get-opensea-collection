import { existsSync, mkdirSync, createWriteStream } from "fs";
import fetch from "node-fetch";
import cliProgress from "cli-progress";

process.on("exit", () => console.log("Exiting..."));

const getCollection = async (collectionName) => {
  let collection = null;

  const res = await fetch(
    `http://api.opensea.io/api/v1/collection/${collectionName}?format=json`
  );

  if (res.ok) {
    collection = await res.json();
  } else {
    if (res.status === 404) {
      console.log(
        "Collection not found \nMake sure you have the correct collection name \nThe collection name is the name in the link from opensea. \nFor example: https://opensea.io/collection/--->cryptopunks<---"
      );
    } else {
      console.log(`Failed to fetch collection: ${res.statusText}`);
    }
    process.exit(1);
  }

  return collection;
};

(async () => {
  const progBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  const collectionName = process.argv.slice(2)[0];

  if (!collectionName) {
    console.log(
      "Please provide a collection name: node index.js <collectionName>"
    );
    process.exit(1);
  }

  if (!existsSync("./images")) mkdirSync("./images");

  if (!existsSync(`./images/${collectionName}`))
    mkdirSync(`./images/${collectionName}`);

  const collection = await getCollection(collectionName);
  const collectionCount = parseInt(collection.collection.stats.count);

  const iterations = Math.ceil(collectionCount / 50);

  progBar.start(collectionCount, 0);

  for (let i = 0; i < iterations; i++) {
    let offset = i * 50;

    let res = await fetch(
      `https://api.opensea.io/api/v1/assets?order_direction=asc&offset=${offset}&limit=50&collection=${collectionName}&format=json`
    );

    if (res.ok) {
      let data = await res.json();
      let assets = data.assets;

      for (let asset of assets) {
        if (existsSync(`./images/${collectionName}/${asset.name}.png`)) {
          console.log(`${asset.name} already exists, skipping`);
        } else {
          if (asset.image_url) {
            let res = await fetch(asset.image_url);
            if (res.ok) {
              res.body.pipe(
                createWriteStream(
                  `./images/${collectionName}/${asset.name}.png`
                )
              );
              progBar.increment();
            } else {
              console.log("Failed to fetch image for asset: ", asset.name);
            }
          } else {
            console.log(`${asset.name} has no image, skipping`);
          }
        }
      }
    }
  }
  progBar.stop();
})();
