//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

//MAP NOTATION: 1st input - key, 2nd input - value
//ex. [{key}, {value}] --> ["apples", 500]

//WHEN CSV IS CREATED --> import everything from CSV
import csvWriter from "csv-write-stream";
import * as fs from "fs";
// import { writer } from "repl";
import Papa from "papaparse";

import Item, { ITEMS } from "./items.js";

export class Order {
  /**
   * @param {Item} item
   * @param {number} count
   */
  constructor(item, count) {
    this.item = item;
    this.count = count;
  }

  /**
   * @param {Array<Item>} items
   * @param {Array<number>} counts
   * @return {Array<Order>}
   */
  static zip(items, counts) {
    const output = new Array(Math.min(items.length, counts.length));
    for (let i = 0; i < output.length; i++) {
      output[i] = new Order(items[i], counts[i]);
    }
    return output;
  }
}

export class Purchase {
  /**
   * @param {string} username
   * @param {Array<Order>} orders
   * @param {number} total
   * @param {string} creditCard
   * @param {string} address
   */
  constructor(username, orders, total, creditCard, address) {
    this.username = username;
    this.orders = orders;
    this.total = total;
    this.creditCard = creditCard;
    this.address = address;
  }
}

export class Client {
  /**
   * @param {string} username
   * @param {string} name
   * @param {Map<string, Order>} cart
   * @param {Array<string>} saved
   */
  constructor(username, name, cart = new Map(), saved = []) {
    this.username = username;
    this.name = name;
    this.cart = cart;
    this.saved = new Set(saved);
  }

  /**
   * @param {string} itemName
   * @param {number} itemCount
   */
  addToCart(itemName, itemCount) {
    this.cart.set(itemName, new Order(ITEMS.get(itemName), itemCount));
    this.rewrite();
  }

  /**
   * @param {string} itemName
   */
  removeFromCart(itemName) {
    this.cart.delete(itemName);
    this.rewrite();
  }

  /**
   * @param {string} itemName
   */
  addToSaved(itemName) {
    this.saved.add(itemName);
    this.rewrite();
  }

  /**
   * @param {string} itemName
   */
  removeFromSaved(itemName) {
    this.saved.delete(itemName);
    this.rewrite();
  }

  rewrite() {
    const orders = Array.from(this.cart.values());
    const cartItems = orders.map((order) => order.item.toString());
    const cartCounts = orders.map((order) => order.count);
    const writer = fs.createWriteStream("clients/" + this.username + ".csv", {
      flags: "w",
    });
    writer.write(this.name);
    writer.write("Cart Items," + cartItems.join(","));
    writer.write("Cart Counts," + cartCounts.join(","));
    writer.write("Saved Items," + Array.from(this.saved).join(","));
    writer.end();
  }
}

export const accountsMap = new Map([
  ["adminOG", "encryptedPassword"],
  ["Steve", "password123"],
]);

/** @type {Map<string, Client} Maps usernames to client objects */
export const clients = new Map();
/** @type {Map<number, Purchase} Maps order numbers to purchase objects */
export const purchases = new Map();

let nextOrderNumber = 0;

initializeMaps();

function initializeMaps() {
  Papa.parse(fs.createReadStream("logins.csv", "utf-8"), {
    header: true,
    step: (result) => accountsMap.set(result.Username, result.Password),
  });
  fs.readdirSync("clients").forEach(initializeClient);
  Papa.parse(fs.createReadStream("orders.csv", "utf-8"), {
    step: (result) =>
      purchases.set(
        parseInt(result.data[0]),
        new Purchase(result.data[1], result.data[2].split(",")),
      ),
    complete: () => (nextOrderNumber = Math.max(...purchases.keys()) + 1),
  });
}

/**
 * @param {string} partialPath
 */
function initializeClient(partialPath) {
  const username = partialPath.slice(0, -4);
  Papa.parse(fs.readFileSync("clients/" + partialPath, "utf8"), {
    complete: (result) => {
      const rows = result.data.map((arr) => arr.filter((str) => str !== ""));
      const name = rows[0][0];
      const cart = new Map();
      for (let i = 0; i < rows[1].length; i++) {
        cart.set(
          rows[1][i],
          new Order(ITEMS.get(rows[1][i]), parseInt(rows[2][i])),
        );
      }
      clients.set(username, new Client(username, name, cart, rows[3]));
    },
  });
}

//For recieving messages from the client
export function handleMessage(client, message) {
  console.log("Message action recieved");
  const data = JSON.parse(message.data).serverMSG;
  console.log(data);

  //if client pressed the login button
  if (data.method == "loginAttempt") {
    console.log("detected login attempt");
    let acc = {
      username: data.username,
      password: data.password,
    };
    // checkAcc(acc);
    if (checkAcc(acc)) {
      sendToClient(client, "validLogin");
    }
  }

  //If client attempted to create an account
  else if (data.method == "signupAttempt") {
    let acc = {
      username: data.username,
      name: data.name,
      password: data.password,
    };
    newAcc(client, acc);
  }

  //Anything we haven't handled yet
  else {
    console.log("Unhandled message");
    console.log(data.method);
  }
}

//For sending messages to the client's front end.
export function sendToClient(client, message) {
  client.send(JSON.stringify({ messageEvent: message }));
}

/* METHOD REQUIREMENTS
 * acc is passed in as a variable holding username and password
 backend will ensure that the value matches the key and return this information to front end
 */
export function checkAcc(acc) {
  // let bool;
  console.log(acc);
  const matches = accountsMap.get(acc.username) == acc.password;
  console.log(matches);
  return matches;
  // if (accountsMap.has(acc.username)) {
  //   if (accountsMap.get(acc.username) == acc.password) {
  //     bool = true;
  //   } else {
  //     bool = false;
  //   }
  // } else {
  //   bool = false;
  // }
  // console.log(bool);
  // return bool;
}

/* METHOD REQUIREMENTS
 * acc is passed in as a variable holding username and password
 backend will send info back to front end and ensure that this account is NOT already in use
  * also make sure to add the new acc to CSV
 */
export function newAcc(client, acc) {
  if (accountsMap.has(acc.username)) {
    console.log("account is already in use");
    sendToClient(client, "invalidSignup");
  } else {
    accountsMap.set(acc.username, acc.password);
    const newClient = new Client(acc.username, acc.name);
    clients.set(acc.username, newClient);
    const loginWriter = csvWriter({ sendHeaders: false });
    loginWriter.pipe(fs.createWriteStream("logins.csv", { flags: "a" }));
    loginWriter.write({ username: acc.username, password: acc.password });
    loginWriter.end();
    sendToClient(client, "validSignup");
  }
}

/**
 * @param {string} username
 * @param {Array<string>} itemNames
 * @param {Array<number>} itemCounts
 * @param {number} totalPrice
 * @param {string} creditCard - credit card number
 * @param {string}
 */
export function newOrder(
  username,
  itemNames,
  itemCounts,
  totalPrice,
  creditCard,
  address,
) {
  const items = itemNames.map((name) => ITEMS.get(name));
  const client = clients.get(username);
  clients.cart = [];
  client.rewrite();
  const orderNumber = nextOrderNumber++;
  purchases.set(
    orderNumber,
    new Purchase(username, Order.zip(items, itemCounts)),
  );
  const writer = csvWriter({ sendHeaders: false });
  writer.pipe(fs.createWriteStream("orders.csv", { flags: "a" }));
  writer.write({
    orderNumber: orderNumber,
    username: username,
    items: itemNames,
    counts: itemCounts,
    total: totalPrice,
    creditCard: creditCard,
    address: address,
  });
  writer.end();
}
