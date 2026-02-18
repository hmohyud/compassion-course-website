# Compassion Course Website with CMS

A beautiful, responsive website for the Compassion Course with a complete content management system (CMS) that allows admins to edit website content dynamically.

## 🌟 Features

### Website Features
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Modern UI**: Clean, professional design with blue accent colors
- **Fast Loading**: Optimized for performance
- **Accessibility**: WCAG compliant with proper focus states and keyboard navigation

### CMS Features
- **User Authentication**: Secure login/logout system
- **Role-Based Access**: Users, Admins, and Super Admins
- **Content Management**: Edit all website text through admin panel
- **Content History**: Track changes and restore previous versions
- **User Management**: Manage user accounts and permissions
- **Real-time Updates**: Changes appear immediately on the website

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   ```bash
   # Copy the example environment file
   cp env-example.txt .env
   
   # Edit .env file with your settings
   nano .env
   ```

3. **Initialize Database**
   ```bash
   npm run init-db
   ```
   This will:
   - Create an admin user
   - Set up default website content
   - Show you the admin login credentials

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Access Your Website**
   - **Website**: http://localhost:3000
   - **Admin Panel**: http://localhost:3000/admin
   - **Login Page**: http://localhost:3000/login

## 📱 Usage

### For Website Visitors
- Visit the main website at `http://localhost:3000`
- Browse the Compassion Course information
- Contact or register for courses

### For Admins
1. Go to `http://localhost:3000/login`
2. Login with admin credentials (shown after running `npm run init-db`)
3. Access the admin panel to:
   - Edit website content
   - Manage users
   - View statistics
   - Update settings

## 🔧 Configuration

### Environment Variables

Create a `.env` file with these settings:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/compassion-course

# Security
JWT_SECRET=your-super-secure-jwt-secret-key

# Server
PORT=3000
NODE_ENV=development

# Admin Account
ADMIN_EMAIL=admin@compassioncourse.com
ADMIN_PASSWORD=change-this-secure-password
```

### Database Setup

#### Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use default connection: `mongodb://localhost:27017/compassion-course`

#### MongoDB Atlas (Cloud)
1. Create a MongoDB Atlas account
2. Create a cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env`

## 📤 Deployment

- **Firebase (Hosting, Storage, GitHub Actions):** See [docs/FIREBASE_DEPLOYMENT.md](docs/FIREBASE_DEPLOYMENT.md) for push-to-main workflow, required secrets, and manual deploy commands.
- **Stripe keys (payments):** See [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) for backend and optional frontend key setup.

## 👥 User Roles

### User
- Basic website access
- Can register and login
- View public content

### Admin
- All user permissions
- Edit website content
- Manage other users (except super-admins)
- Access admin panel

### Super Admin
- All admin permissions
- Change user roles
- Cannot be deactivated by other admins
- Full system access

## 📝 Content Management

### Content Types
- **Hero Section**: Main banner content
- **About Section**: Company information
- **Programs**: Course offerings
- **Testimonials**: Customer reviews
- **Statistics**: Numbers and metrics
- **Call to Action**: Registration prompts
- **Navigation**: Menu items
- **Footer**: Footer links and info

### Editing Content
1. Login to admin panel
2. Go to "Content Management"
3. Click "Edit" on any content item
4. Make changes and save
5. Changes appear immediately on the website

### Content History
- Every content change is tracked
- View previous versions
- Restore to any previous version
- Track who made changes and when

## 🔒 Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent abuse and attacks
- **Input Validation**: Server-side validation
- **CORS Protection**: Cross-origin request security
- **Helmet.js**: Security headers
- **Account Locking**: Auto-lock after failed attempts

## 🛠 Development

### Project Structure
```
compassion-course/
├── admin/              # Admin panel frontend
├── auth/               # Authentication pages
├── models/             # Database models
├── routes/             # API routes
├── middleware/         # Custom middleware
├── public/             # Static website files
├── scripts/            # Utility scripts
├── uploads/            # File uploads (created automatically)
├── server.js           # Main server file
└── package.json        # Dependencies and scripts
```

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-restart
- `npm run init-db` - Initialize database with default data

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Content (Public)
- `GET /api/content` - Get all published content
- `GET /api/content/section/:section` - Get content by section
- `GET /api/content/key/:key` - Get content by key

#### Admin (Protected)
- `GET /api/admin/content` - Manage content
- `POST /api/admin/content` - Create content
- `PUT /api/admin/content/:id` - Update content
- `DELETE /api/admin/content/:id` - Delete content
- `GET /api/admin/users` - Manage users

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production` in `.env`
2. Use a strong JWT secret
3. Use MongoDB Atlas for database
4. Set up SSL certificate
5. Use a process manager like PM2

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/compassion-course
JWT_SECRET=super-secure-production-secret
PORT=3000
```

### Firebase (Firestore)
When using Firestore, deploy rules and indexes so features like team whiteboards work: `firebase deploy --only firestore:indexes` (and `firestore:rules` as needed). The team whiteboard list query requires the composite index defined in `firestore.indexes.json`. The userNotifications index in that file is required for My Messages (mention notifications) on the Leader Dashboard.

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
- Check MongoDB is running
- Verify connection string in `.env`
- Check network connectivity for Atlas

**Admin Login Not Working**
- Run `npm run init-db` to create admin user
- Check credentials in console output
- Verify user role is 'admin' or 'super-admin'

**Content Not Updating**
- Check user permissions
- Verify content is marked as published
- Clear browser cache

**Port Already in Use**
- Change PORT in `.env` file
- Kill process using the port: `kill -9 $(lsof -ti:3000)`

## 📞 Support

For questions or issues:
1. Check this README for solutions
2. Review error logs in the console
3. Verify environment configuration
4. Check database connectivity

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy Course Management! 🎉**
# Deployment trigger Fri Jan 16 11:45:12 GMT 2026
