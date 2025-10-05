// config/swagger.js
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Freelancer Platform API',
			version: '1.0.0',
			description: 'API completa para plataforma de freelancers',
			contact: {
				name: 'Suporte FreelancerHub',
				email: 'suporte@freelancerhub.com',
			},
		},
		servers: [
			{
				url: 'http://localhost:5000',
				description: 'Servidor de Desenvolvimento',
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
			schemas: {
				User: {
					type: 'object',
					properties: {
						_id: { type: 'string' },
						name: { type: 'string' },
						email: { type: 'string', format: 'email' },
						avatar: { type: 'string', default: '👤' },
						userType: { type: 'string', enum: ['freelancer', 'client'] },
						profileComplete: { type: 'boolean', default: false },
						title: { type: 'string' },
						bio: { type: 'string' },
						hourlyRate: { type: 'number' },
						skills: { type: 'array', items: { type: 'string' } },
						rating: { type: 'number', minimum: 0, maximum: 5 },
						completedProjects: { type: 'number' },
					},
				},
				Project: {
					type: 'object',
					properties: {
						_id: { type: 'string' },
						title: { type: 'string' },
						description: { type: 'string' },
						client: { $ref: '#/components/schemas/User' },
						budget: {
							type: 'object',
							properties: {
								min: { type: 'number' },
								max: { type: 'number' },
								currency: { type: 'string', default: 'BRL' },
							},
						},
						category: {
							type: 'string',
							enum: [
								'Desenvolvimento Web',
								'Design UI/UX',
								'Marketing Digital',
								'Redação',
								'Tradução',
								'Consultoria',
								'Outro',
							],
						},
						skills: { type: 'array', items: { type: 'string' } },
						timeline: { type: 'string' },
						status: {
							type: 'string',
							enum: ['open', 'in_progress', 'completed', 'cancelled'],
							default: 'open',
						},
					},
				},
				AuthResponse: {
					type: 'object',
					properties: {
						_id: { type: 'string' },
						name: { type: 'string' },
						email: { type: 'string' },
						avatar: { type: 'string' },
						userType: { type: 'string' },
						profileComplete: { type: 'boolean' },
						token: { type: 'string' },
					},
				},
				Error: {
					type: 'object',
					properties: {
						message: { type: 'string' },
						errors: { type: 'array', items: { type: 'object' } },
					},
				},
			},
		},
		security: [{ bearerAuth: [] }],
	},
	// 🔥 CORRIJA O CAMINHO DAS APIS - Teste estas opções:
	apis: [
		'./routes/*.js', // Opção 1 - Relativo ao diretório do processo
		'./src/routes/*.js', // Opção 2 - Se estiver em src/routes
		'./backend/routes/*.js', // Opção 3 - Se estiver em backend/routes
		join(__dirname, '../routes/*.js'), // Opção 4 - Caminho absoluto
	],
}

const swaggerSpec = swaggerJSDoc(options)

// 🔥 Adicione logs para debug
console.log('🔄 Gerando documentação Swagger...')
console.log('📁 Caminho das APIs:', options.apis)

const swaggerDocs = (app) => {
	// Rota para documentação Swagger UI
	app.use(
		'/api-docs',
		swaggerUi.serve,
		swaggerUi.setup(swaggerSpec, {
			explorer: true,
			customCss: '.swagger-ui .topbar { display: none }',
			customSiteTitle: 'Freelancer Platform API Docs',
		}),
	)

	// Rota para specs em JSON
	app.get('/api-docs.json', (req, res) => {
		res.setHeader('Content-Type', 'application/json')
		res.send(swaggerSpec)
	})

	console.log('✅ Swagger Spec carregado com', Object.keys(swaggerSpec.paths || {}).length, 'rotas')
	console.log('📚 Documentação disponível em http://localhost:5000/api-docs')
}

export default swaggerDocs
