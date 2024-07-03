# Quiz App API

This is the Quiz App API, which provides endpoints for managing classes, quizzes, responses, and results. The APP is hosted on [https://quiz-app.eroslabs.live/](https://quiz-app.eroslabs.live/), and its Swagger documentation is available at [https://quiz-app.eroslabs.live/api-docs/](https://quiz-app.eroslabs.live/api-docs/).

## API Documentation

The API documentation is available at [https://quiz-app.eroslabs.live/api-docs/](https://quiz-app.eroslabs.live/api-docs/).

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

## UI Testing
For testing the API and its functionalities, UI has been created by [EN-NAQQACH](https://github.com/EN-NAQQACH/Quiz-App). This project is a collaboration between us, where I developed all the APIs used in the Quiz interface, and [EN-NAQQACH](https://github.com/EN-NAQQACH/Quiz-App) created the impressive interface.

Additional documentation for the interface can be found in [EN-NAQQACH](https://github.com/EN-NAQQACH/Quiz-App)'s repository.

## Contributing

The codebase could use some organization and cleanup. It's a bit of spaghetti code at the moment, so any contributions in this area would be greatly appreciated.

## License
[Apache-2.0](https://choosealicense.com/licenses/apache-2.0/)