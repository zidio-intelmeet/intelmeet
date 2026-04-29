import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import swaggerDocument from "./src/docs/swagger-document";

const outputFile = resolve(process.cwd(), "src/docs/swagger.json");

writeFileSync(outputFile, JSON.stringify(swaggerDocument, null, 2));

console.log(`Swagger docs written to ${outputFile}`);
