# OLK Films Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster.mongodb.net/olkfilms?retryWrites=true&w=majority

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free account or sign in
3. Create a new cluster (choose M0 Free tier)
4. Create a database user with read/write access
5. Get your connection string and replace the placeholders in MONGODB_URI
6. Make sure to add your IP address to the Network Access whitelist

## Creating an Admin User

After setting up the database, you can create an admin user by:
1. Register a new account through the app
2. Use MongoDB Compass or Atlas to update the user's role to 'admin'

Or run this in MongoDB Shell:
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```
