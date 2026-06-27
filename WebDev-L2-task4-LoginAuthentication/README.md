Create a secure and modern Login Authentication System using HTML5, CSS3, and Vanilla JavaScript.

Project Title:
Login Authentication System

Objective:
Build a client-side authentication system that allows users to register, login, access a protected dashboard page, and logout securely. Use localStorage for storing user data and implement basic password hashing using SHA-256.

Requirements:

1. Project Structure:
Create separate files:

- index.html (Login Page)
- register.html (Registration Page)
- dashboard.html (Protected Dashboard Page)
- style.css
- script.js

2. Registration Page:
Create a user registration form with:
- Username field
- Email field
- Password field
- Confirm Password field
- Register button

Features:
- Prevent empty form submission
- Validate password requirements:
  - Minimum 8 characters
  - At least 1 number
- Check if username/email already exists
- Display proper error messages
- Show successful registration message after account creation
- Store user information in localStorage
- Do not store passwords in plain text
- Hash passwords using SHA-256 before storing

3. Login Page:
Create a login form with:
- Username or Email input
- Password input
- Login button

Features:
- Validate empty fields
- Verify entered credentials with stored user data
- Show a clear error message for incorrect credentials:
  "Invalid username/email or password"
- Do not reveal whether username or password is incorrect
- After successful login:
  - Create login session using localStorage
  - Redirect user to dashboard.html

4. Protected Dashboard Page:
Create a dashboard page that:
- Can only be accessed after successful login
- Checks authentication session when the page loads
- Redirects unauthorized users back to login page
- Displays a welcome message with logged-in username/email
- Includes a Logout button

5. Logout Functionality:
- Logout button should:
  - Clear login session from localStorage
  - Redirect user to login page

6. Security Requirements:
- Never store plain text passwords
- Use SHA-256 hashing using JavaScript Crypto API
- Store only hashed passwords
- Handle authentication state properly

7. Design Requirements:
- Create a modern professional UI
- Use attractive login/register cards
- Add smooth animations and hover effects
- Use clean typography
- Create responsive layouts for:
  - Desktop
  - Tablet
  - Mobile

8. Additional Features:
- Add password visibility toggle option
- Add form validation messages
- Add navigation links between Login and Register pages
- Use semantic HTML5 elements
- Keep UI consistent across all pages

9. Code Requirements:
- Use only HTML5, CSS3, and Vanilla JavaScript
- Write clean and well-commented code
- Explain important JavaScript functions with comments
- Make the project beginner-friendly and portfolio-ready

Output:
Provide complete working code separately for:
1. index.html
2. register.html
3. dashboard.html
4. style.css
5. script.js