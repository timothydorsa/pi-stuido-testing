const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'System Monitor Dashboard API',
      version: '1.0.0',
      description: 'API documentation for System Monitor Dashboard',
      license: {
        name: 'ISC',
      },
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:8001',
        description: 'Development server',
      },
    ],
  },
  // Path to the API docs
  apis: ['./backend/server.js', './backend/routes/*.js'],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Function to setup our docs
const swaggerDocs = (app) => {
  // Route for swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Docs in JSON format
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log(`Swagger docs available at http://localhost:8001/api-docs`);
};

module.exports = { swaggerDocs };
