import * as fs from "fs";
import { parse } from "csv-parse";

export default class Item {
	/**
	 * @param {string} department
	 * @param {string} name
	 * @param {string} price
	 * @param {Array<string>} imageURLs
	 * @param {string} description
	 * @param {string} category
	 * @param {string} brand
	 * @param {Array<string>} colors
	 * @param {Array<string>} sizes
	 */
	constructor(
		department,
		name,
		price,
		imageURLs,
		description,
		category,
		brand,
		colors,
		sizes
	) {
		this.department = department;
		this.name = name;
		this.price = parseFloat(price.replace("$", ""));
		this.imageURLs = imageURLs;
		this.description = description;
		this.category = category;
		this.brand = brand;
		this.colors = colors;
		this.sizes = sizes;
	}

	toString() {
		if (this.name.toLowerCase().includes(this.brand.toLowerCase())) {
			return this.name;
		} else {
			return this.brand + " " + this.name;
		}
	}

	/**
	 * @param {string} field
	 */
	getProperty(field) {
		switch (field.toLowerCase()) {
			case "department":
				return this.department;
			case "name":
				return this.name;
			case "price":
				return this.price;
			case "imageURLs":
				return this.imageURLs;
			case "brands":
			case "brand":
				return this.brand;
			case "category":
			case "categories":
				return this.category;
			case "colors":
				return this.colors;
			case "sizes":
				return this.sizes;
			default:
				throw new ReferenceError("no such field exists");
		}
	}
}

export const DEPT_PATHS = fs.readdirSync("departments");
export const ITEMS = new Map();

DEPT_PATHS.forEach(putAllItems);

function putItem(dept, line) {
	const newItem = new Item(dept, ...line);
	ITEMS.set(newItem.toString(), newItem);
}

function putAllItems(path) {
	fs.createReadStream("departments/" + path)
		.pipe(parse({ delimiter: ",", from_line: 2 }))
		.on("data", (line) => putItem(path.slice(0, -4), line));
}
