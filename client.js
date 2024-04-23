//import the grpc module, protoLoader module, and readline module for user input
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const readline = require('readline');

//load all 4 protos and the protocall buffer package definition for each
const packageDefinition1 = protoLoader.loadSync('authentication.proto');
const authenticationService = grpc.loadPackageDefinition(packageDefinition1).smartRetail;
const packageDefinition2 = protoLoader.loadSync('autonomousCheckout.proto');
const autonomousCheckout = grpc.loadPackageDefinition(packageDefinition2).smartRetail;
const packageDefinition3 = protoLoader.loadSync('smartShelf.proto');
const smartShelf = grpc.loadPackageDefinition(packageDefinition3).smartRetail;
const packageDefinition4 = protoLoader.loadSync('recommendation.proto');
const recommendationService = grpc.loadPackageDefinition(packageDefinition4).smartRetail;

//create an instance of each client on a local host address
const authenticationServiceClient = new authenticationService.Authentication('localhost:50051', grpc.credentials.createInsecure());
const autonomousCheckoutClient = new autonomousCheckout.AutonomousCheckout('localhost:50054', grpc.credentials.createInsecure());
const smartShelfClient = new smartShelf.SmartShelf('localhost:50053', grpc.credentials.createInsecure());
const recommendationServiceClient = new recommendationService.Recommendation('localhost:50052', grpc.credentials.createInsecure());

//set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

//put the askquestion method in a promise to you can asyncrhoniously wait for user input before porforming subsequent actions
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

//authenticate user login details by using readline to asynchroniously accept the username and password
function authenticateUser(callback) {
  rl.question('Please enter your username: ', (username) => {
      rl.question('Please enter your password: ', (password) => {
          const request = { username, password };
          authenticationServiceClient.authenticateUser(request, (error, response) => { //send the request to the authenticaeUser fuction and handle the callack response
              if (error) {
                  console.error('Authentication failed:', error.message);
                  authenticateUser(callback);
              } else {
                  console.log(`User '${username}' logged in successfully`);
                  callback();
              }
          });
      });
  });
}


//user menu fuction to prompt the user for a command and initiate approritate request the to the server
async function userMenu() {
  console.log(); // print commands
  console.log('Select an operation:');
  console.log('1: Product catalogue');
  console.log('2: Check product stock & location');
  console.log('3: Add product to cart');
  console.log('4: Get personalised product recommendations');
  console.log('5: Checkout');
  console.log('6: Exit');
  console.log();

  //ask for choice and wait for input
  const choice = await askQuestion('Enter choice: ');
  switch (choice) { //switch case to direct the prompt
    case '1': //if 1 is entered, call the get product names fuction with the usermenu as a callback to return to it once the request in handled
      getProductNames(userMenu); 
      break;
    case '2'://prompt for product to check and call on the fuction with user menu callback
      const productToCheck = await askQuestion('Enter product name: ');
      getProductInfo(productToCheck, userMenu);
      break;
    case '3'://add to cart command with name & qty sent the function
      const productToAdd = await askQuestion('Enter product name: ');
      const quantity = await askQuestion('Enter quantity: ');
      addToCart(productToAdd, parseInt(quantity), userMenu);
      break;
    case '4'://get product recomnedation command
      getPromotionalRecommendations(userMenu);
      break;    
    case '5': 
      calculateTotal(async(total) => { // calc total and disply the respnonse, prompt user if they want to purchase
        console.log('The total cost is:', total);
        const checkoutReply = await askQuestion('Do you want to purchase? Y/N');
        if (checkoutReply == 'Y'){ // if yes enter a while loop that continues until card details succfully inputted
          let purchaseSuccess = false;
          while(!purchaseSuccess) {
            console.log('Please enter card details:');
            //accept card details and disply for debugging 
            const card_number = await askQuestion('Please enter the card number (16 digits): ');
            const expiration_date = await askQuestion('Please enter the expiration date (MM/YY):');
            const cvv = await askQuestion('Please enter the CVV (3 digits):');
            console.log("Card number:", card_number);
            console.log("Expiration date:", expiration_date);
            console.log("CVV:", cvv);
            //call on the purchase function and await response, store this in a varibale
            purchaseSuccess = await purchase(total, card_number, expiration_date, cvv);
            if (purchaseSuccess.success) { // if true retrive the cart, once retived call the update stock fuction with each cart item to update the inventory 
              getCart()
              .then(cart => {
                updateStock(cart);
                console.log('Purchase succsessful');
                console.log('Thanks for shopping with us!');
                process.exit(); // exit the process
              })
              .catch(error => { // handle errors
                  console.error('Error retrieving cart:', error.message);
              });
            } else { // notify purchase unsuccefful and continue loop
              console.log('Purchase unsuccessful, try again.');
            }
          }
        
        } else { // if user doent want to purchase return to menu
          userMenu();
        } 
      });
      break; 
    case '6': //command to exit the app and end proccess
      console.log('Exiting the app')
      process.exit();
    default: //default case for invalid selections
      console.log('Invalid selection');
      userMenu();
      break;         
  }
}    

//server side streaming fuction to retrive product list
function getProductNames(callback) {
  const call = smartShelfClient.GetProductNames({}); //send empty request

  const Fruit = [];
  const Veg = [];
  const Meat = [];
  const Other = [];

  //listen for data repsonses from server and add to the array according to category
  call.on('data', (response) => {
    switch (response.category) {
      case 'Fruit':
        Fruit.push(response.name);
        break
      case 'Veg':
        Veg.push(response.name);
      case 'Meat':
        Meat.push(response.name);
      default:
        Other.push(response.name);      
    }
  });
  
  //once the serrver ends the stream, print each category
  call.on('end', () => {
    console.log();
    console.log('Fruit:');
    console.log(Fruit);
    console.log('Veg:');
    console.log(Veg);
    console.log('Meat:');
    console.log(Meat);
    console.log('Other:');
    console.log(Other);
    if (callback) callback();
  });
  
  call.on('error', (error) => { // handle errors during streaming
    console.error('Error:', error.message);
    if (callback) callback(); 
  });
}



//function to send requets to smart shelf to return info on that product
function getProductInfo(productName, callback) {
  const request = { productName: productName };
  smartShelfClient.getProductInfo(request, (error, response) => {
      if (error) {
          console.error('Error:', error.message);
      } else {
          console.log('Product Info:', response);
      }
      if (callback) callback(); 
  });
}

//functio to add items to the cart
async function addToCart(productName, quantity, callback) {
  try {
    //check if in stock and await result
    const instock = await checkStock(productName, quantity); 
    console.log('In stock:', instock);
    if (instock.success) { //if in stock returns true add to the cart 
      const price = await getPrice(productName); 
      console.log('Price per item:', price);
        const request = { productName, quantity, price };
        autonomousCheckoutClient.AddToCart(request, (error, response) => {
            if (error) {
                console.error('Error adding to cart:', error.message); 
            } else {
                console.log('Successfully added to cart');
            }
            if (callback) callback(); //user menu callback once sucessful
        });
    } else {
        console.log(`Insufficient stock of ${productName}`);
        if (callback) callback(); 
    }
  } catch (error) {//handle errors
      console.error('Error:', error.message);
      if (callback) callback(); 
  }
}

function checkStock(productName, quantity) {
  return new Promise((resolve, reject) => {
    smartShelfClient.checkStock({ productName, quantity }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

//request the current price of an item from the smartshelf using a promise so we work with the response ins asynchronous way
function getPrice(productName) {
  return new Promise((resolve, reject) => {
    smartShelfClient.GetPrice({ productName }, (error, response) => {
        if (error) {
            reject(error);
        } else {
            resolve(response.price);
        }
    });
  });
}

async function getPromotionalRecommendations(callback) {
  try {
      const call = recommendationServiceClient.getPromotionalRecommendations();

      call.on('data', (response) => {
          console.log('Received promotions:', response.promotion);
      });

      call.on('end', () => {
          console.log('Server stream ended');
          if (callback) callback(); 
      });

      call.on('error', (error) => {
          console.error('Error:', error.message);
          if (callback) callback(error); 
      });

      while (true) {
          const productName = await askQuestion('Enter a product name (or type "exit" to quit): ');
          if (productName.toLowerCase() === 'exit') {
              call.end();
              callback();  
              break;
          }
          call.write({ name: productName });
      }
  } catch (error) {
      console.error('Error:', error.message);
      if (callback) callback(error);
  }
}



//get cart from the checkout server as a promise object
function getCart() {
  return new Promise((resolve, reject) => {
      autonomousCheckoutClient.getCart({}, (error, response) => {
          if (error) {
              console.error('Error retrieving cart:', error.message);
              reject(error);
              return;
          }
          resolve(response.cart);
      });
  });
}

//call on the checkout to calculate the total and log the result
function calculateTotal(callback) {
  autonomousCheckoutClient.calculateTotal({}, (error, response) => {
      if (error) {
          console.error('Error with calculation:', error.message);
          return;
      }
      console.log('Cart total:', response.total);
      callback(response.total);
  });
}
//send the card detauls to the  checkout to purchase the cart and return a promise so we can updated the stock after if 
function purchase(total, cardNumber, expirationDate, cvv) {
  return new Promise((resolve, reject) => {
    const request = {
      total: total,
      cardNumber: cardNumber,
      expirationDate: expirationDate,
      cvv: cvv
    };
    autonomousCheckoutClient.purchase(request, (error, response) => {
      if (error) {
        console.error('Error making purchase:', error.message);
        reject(error);
      } else {
        resolve(response); // Assuming response is { success: true } or similar
      }
    });
  });
}

//client side streaming to update the inventory once the purchase is succeful
function updateStock(cart) {
  const call = smartShelfClient.UpdateStock((error, response) => {
      if (error) {
          console.error('Error updating stock:', error.message);
          return;
      }
      console.log('Stock update response:', response);
  });

  cart.forEach(item => { //stream each ite,
      call.write({ 
        productName: item.productName, 
        quantity: item.quantity 
      });
  });

  call.end();
}




//call thel log in fuction with the user menu asa  callback fuction so as to only contiue to it if log in successful
console.log('Welcome to Kierans Grocerys!');  
authenticateUser(userMenu);
