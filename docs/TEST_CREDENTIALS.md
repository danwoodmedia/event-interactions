# Test Credentials

## Default Admin User

For testing purposes, a default admin/producer account has been created:

**Email:** `admin@example.com`
**Password:** `admin`

### Usage

1. Navigate to the login page: `http://localhost:5173/login`
2. Enter the credentials above
3. You'll be redirected to the Producer panel at `/producer`

### Features Available

Once logged in as admin, you can:
- Create and manage events
- Create polls and poll bundles
- Configure emoji packs
- Moderate Q&A questions
- Generate password-protected A/V Tech URLs
- View live stats and engagement metrics

### Security Note

⚠️ **Important:** This is a test account for development only. In production:
- Delete this account or change the password immediately
- Use strong, unique passwords for all accounts
- Enable email verification
- Consider implementing 2FA for admin accounts

## Creating Additional Test Users

To create additional test users, you can either:

1. **Use the Signup Page:** Navigate to `/signup` and create a new producer account
2. **Run the seed script again:** Modify `server/seed-admin.js` with different credentials and run `node seed-admin.js`

## A/V Tech Access

The A/V Tech panel is password-protected per event:
- Default password: `0000`
- Producers can change this password from the Producer panel
- No separate login required - password is event-specific
