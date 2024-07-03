const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const swagger = require('./swagger');
const auth = require('./middleware/auth')

require('dotenv').config();


const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const classesRouter = require('./routes/classes');



const app = express();

(
  async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('connected to database');
    } catch (error) {
      console.log(error);
    }
  }
)()

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors())

// app.use('/', indexRouter);
app.use('/api/user', usersRouter);
app.use('/api/classes', auth, classesRouter)
app.use('/api-docs', swagger.serve, swagger.setup);
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './public', 'index.html'));
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  let error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.json(error);
});

app.listen(process.env.PORT, ()=>{console.log('server is running on port '+process.env.PORT)})

module.exports = app;
