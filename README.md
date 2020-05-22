# TheStore - BuySell Web App
This website is for VJTI students especially freshers who find it difficult to get used books & other study material. 
Seniors can post ads for products which they have used in previous semester. Basically a user can sell as well as buy products here.
This portal connects freshers with their seniors who are interested in selling their used study material.

## Technologies
- HTML 5, CSS 3, Bootstrap 4
- EJS
- Express
- NodeJS
- PostgreSQL

## Get Started
1. Install the latest version of Node & PostgreSQL.
2. Run npm --version & node --version to check if Node is properly installed.
3. Clone this project to your local repository.
4. Run 'npm install' in working directory to install all the dependencies required.
5. Create a postgres daatabase with all DDL statements provided in sql.txt file OR import thevstore.sql file.
6. Set up a .env file in working directory as follows:
![Alt text](public/images/env.jpg?raw=true "Title")

## How it Works
1. User first has to register with valid mail id
2. User can add products for sale or buy from available products
3. He can search for a particular product through all products or category wise also (There are 6 categories)
4. Product details are shown category wise & comments can be added.
5. User can see anyone's profile & can edit his own.
6. Before buying product, it has to be added to cart.
7. When buyer clicks Buy, request is sent to seller through mail.
8. Seller can either accept request or just ignore (Note : He should be logged in while accepting)
9. Once seller accepts, a pass is sent to buyer (Note : Deal is not completed)
10. In order to verify transaction & generate receipt, Seller should mark product as sold to a buyer by entering pass provided by him.
11. If pass matches, transaction is confirmed, a receipt is geerated & mailed to both parties and product shifts to History.



## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.


## License
