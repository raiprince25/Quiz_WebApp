import * as chai from 'chai';
import supertest from 'supertest';
import app from '../app.js';

const expect = chai.expect;
const request = supertest(app);

describe('Express App', () => {
  it('should return a 200 on GET /', async () => {
    const response = await request.get('/');
    expect(response.status).to.equal(200);
  });
});