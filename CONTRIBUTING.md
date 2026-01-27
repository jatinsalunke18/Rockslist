# Contributing to Rockslist

First off, thank you for considering contributing to Rockslist! 🎉

We welcome contributions from everyone. Here are the guidelines we'd like you to follow.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Guidelines](#coding-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that you don't need to create one. When you are creating a bug report, please include as many details as possible using our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue using our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and provide the following information:

- Use a clear and descriptive title
- Provide a detailed description of the suggested enhancement
- Explain why this enhancement would be useful

### Pull Requests

1. Fork the repository and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code lints
5. Issue that pull request!

## 🛠️ Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Firebase project with Auth, Firestore, and Storage enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/rockslist-react.git
   cd rockslist-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm test` - Run tests in watch mode
- `npm run test:ci` - Run tests once
- `npm run test:coverage` - Generate test coverage report
- `npm run validate` - Run all checks (lint, format, test, build)

## 💻 Coding Guidelines

### JavaScript/React Style

- Use functional components with hooks
- Follow the [Airbnb React Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- Use meaningful variable and function names
- Keep components small and focused
- Prefer composition over inheritance

### File Structure

```
src/
├── components/    # Reusable UI components
├── contexts/      # React Context providers
├── hooks/         # Custom React hooks
├── lib/          # Third-party library configurations
├── pages/        # Page components (routes)
├── services/     # API and service functions
├── types/        # Type definitions
└── utils/        # Utility functions
```

### Component Guidelines

1. **File Naming**: Use PascalCase for component files (e.g., `EventCard.jsx`)
2. **Component Structure**:
   ```jsx
   // Imports
   import React from 'react';
   
   // Component
   function MyComponent({ prop1, prop2 }) {
     // Hooks
     // Event handlers
     // Effects
     // Render
     return (
       <div>...</div>
     );
   }
   
   // PropTypes or TypeScript types
   // Exports
   export default MyComponent;
   ```

3. **CSS**: Use modular CSS or inline styles, keep styles co-located with components

### Code Quality

- **Linting**: Code must pass ESLint checks (`npm run lint`)
- **Formatting**: Code must be formatted with Prettier (`npm run format`)
- **Testing**: Write tests for new features and bug fixes
- **Documentation**: Add JSDoc comments for complex functions

## 📝 Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools

### Examples

```bash
feat(rsvp): add guest limit validation
fix(auth): resolve login redirect issue
docs(readme): update setup instructions
style(button): improve hover effects
refactor(api): simplify event fetching logic
test(auth): add login flow tests
```

## 🔄 Pull Request Process

1. **Update Documentation**: Ensure README.md and other docs are updated
2. **Add Tests**: Write tests for your changes
3. **Follow Style Guide**: Ensure code follows our style guidelines
4. **Update CHANGELOG**: Add your changes to CHANGELOG.md
5. **Self-Review**: Review your own code first
6. **Request Review**: Request reviews from maintainers
7. **Address Feedback**: Make requested changes
8. **Squash Commits**: Clean up commit history if needed

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review performed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] CHANGELOG.md updated

## 🐛 Debugging

- Use React DevTools for component debugging
- Check browser console for errors
- Use Firebase Emulator Suite for local testing
- Enable verbose logging in development

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [Testing Library](https://testing-library.com/react)

## ❓ Questions?

Feel free to open an issue with your question or reach out to the maintainers.

**Thank you for contributing! 🎉**
