const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// const uri = `mongodb+srv://BookResaleUser:LYlergMLNwI39QAD@cluster0.hqbzo.mongodb.net/?retryWrites=true&w=majority`;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hqbzo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const BookCategoriesCollection = client.db('BookResale').collection('categories')
        const BooksCollection = client.db('BookResale').collection('books')
        const OrderCollection = client.db('BookResale').collection('orders')
        const UsersCollection = client.db('BookResale').collection('users')
        const PaymentsCollection = client.db('BookResale').collection('payments')

        //payment methods
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body
            const price = booking.price
            const amount = price * 100

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'USD',
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })

        app.post('/payments', async(req, res) =>{
            const payment = req.body;
            const result = await PaymentsCollection.insertOne(payment)
            const id = payment.bookingId;
            const filter = {_id: new ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await OrderCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        //get
        //all categories
        app.get('/categories', async (req, res) => {
            const query = {}
            const cursor = await BookCategoriesCollection.find(query).toArray();
            res.send(cursor);
        })

        //get
        //single category
        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id };
            const result = await BooksCollection.find(query).toArray();
            res.send(result);
        });

        //get
        //sinngle book
        app.get('/allbooks/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const cursor = await BooksCollection.findOne(query)
            res.send(cursor);
        })

        //post
        //order a single book
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await OrderCollection.insertOne(order);
            res.send(result);
        });

        //get
        //see your order collection
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const booking = await OrderCollection.findOne(query);
            res.send(booking);
        })

        //post
        //reg a single user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await UsersCollection.insertOne(user);
            res.send(result);
        });

        //get
        //all users
        app.get('/users', async (req, res) => {
            const query = {}
            const users = await UsersCollection.find(query).toArray()
            res.send(users)
        })

        //get
        //all booked books
        app.get('/bookings', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const bookings = await OrderCollection.find(query).toArray()
            res.send(bookings)
        })


        //get
        //admin or not
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await UsersCollection.findOne(query)
            res.send({ isAdmin: user?.userType === 'admin' })
        })


        //get 
        //seller or not
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email
            const query = { email }
            const user = await UsersCollection.findOne(query)
            res.send({ isSeller: user?.userType === 'seller' })
        })

    
        app.get('/users/sellers', async (req, res) => {
            const query = { userType: "seller" }
            const users = await UsersCollection.find(query).toArray()
            res.send(users)
        })

        app.get('/users/buyers', async (req, res) => {
            const query = { userType: "buyer" }
            const users = await UsersCollection.find(query).toArray()
            res.send(users)
        })

        app.get('/users/admins', async (req, res) => {
            const query = { userType: "admin" }
            const users = await UsersCollection.find(query).toArray()
            res.send(users)
        })

        //post
        //add a book
        app.post('/addbooks', async (req, res) => {
            const book = req.body;
            const result = await BooksCollection.insertOne(book);
            res.send(result);
        })

        //get
        //selleres all books
        app.get('/seller/books', async (req, res) => {
            const email = req.query.email
            const query = { seller_email : email }
            const result = await BooksCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/services', async (req, res) => {
            const search = req.query.search
            console.log(search)
            const query = {
                $text: {
                    $search: search
                }
            }

            const cursor = await BooksCollection.find(query).toArray()
            res.send(cursor)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const userdelete = await UsersCollection.deleteOne(query)
            res.send(userdelete)
        })

        app.patch('/books/:id', async (req, res) => {
            const newi = req.body.availability
            console.log(newi)
            const id = req.params.id;
            console.log(id)
            const filter = {_id: new ObjectId(id)}
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    isAvailable: newi
                },
              };
            const result = await BooksCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        app.get('/books/available', async (req, res) =>{
            const query = { isAvailable: true }
            const cursor = await BooksCollection.find(query).toArray()
            res.send(cursor)
        })
    }
    finally {

    }
}
run().catch(err => console.error(err));


app.get('/', (req, res) => {
    res.send('Book resale server is successfully running')
})


app.listen(port, () => {
    console.log(`Book resaling app is listening on port ${port}`)
})