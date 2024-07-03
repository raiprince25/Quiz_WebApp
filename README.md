# Very Important
 This link {quiz-app.eroslabs.live/} will take time to load because of multiple component and work for both user end and student end.
 
# Quiz_WebApp

This is the Quiz App API, which provides endpoints for managing classes, quizzes, responses, and results.

## Environment Variables

The application requires the following environment variables:

- `JWT_SECRET`: The secret key for JWT. Used for authentication.
- `MONGO_URI`: The MongoDB connection string.
- `NODE_ENV`: The environment in which the application is running (e.g., `development`, `production`).
- `PORT`: The port on which the application is running.

## Tokens

Tokens expire after 24 hours. To modify this, you can change the `generateToken` function inside `routes/users.js`.

## Running the Project

You can run the project using npm:

```bash
npm i
npm start
```

Or you can use Docker. To build the Docker image, use:

```bash
docker build -t quiz-app .
```

To run the Docker container, use:

```bash
docker run -p 5000:5000 --env-file .env quiz-app
```

Replace 5000 with the port you want to use, and .env with your environment variables file.

## Contributing

The codebase could use some organization and cleanup. It's a bit of spaghetti code at the moment, so any contributions in this area would be greatly appreciated.

# Quiz-WebApp
A Quiz WebApp with Teacher and Student Accesss
