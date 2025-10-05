// routes/projects.js
import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.js'
import Project from '../models/Project.js'
import User from '../models/User.js'

const router = express.Router()

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Buscar todos os projetos
 *     description: Retorna uma lista paginada de projetos com filtros
 *     tags: [Projetos]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo para busca textual
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Desenvolvimento Web, Design UI/UX, Marketing Digital, Redação, Tradução, Consultoria, Outro]
 *         description: Filtrar por categoria
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Habilidades separadas por vírgula
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, completed, cancelled]
 *           default: open
 *         description: Status do projeto
 *     responses:
 *       200:
 *         description: Lista de projetos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/', async (req, res) => {
	try {
		const { search, category, skills, page = 1, limit = 10, status = 'open' } = req.query

		let query = { status }

		// Filtros
		if (search) {
			query.$text = { $search: search }
		}

		if (category) {
			query.category = category
		}

		if (skills) {
			const skillsArray = skills.split(',').map((skill) => skill.trim())
			query.skills = { $in: skillsArray }
		}

		const projects = await Project.find(query)
			.populate('client', 'name avatar')
			.sort({ createdAt: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit)

		const total = await Project.countDocuments(query)

		res.json({
			projects,
			totalPages: Math.ceil(total / limit),
			currentPage: page,
			total,
		})
	} catch (error) {
		console.error('Erro ao buscar projetos:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Criar novo projeto
 *     description: Cria um novo projeto (apenas para clientes)
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - budget
 *               - category
 *               - timeline
 *               - skills
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Desenvolvimento de Site E-commerce"
 *               description:
 *                 type: string
 *                 example: "Preciso de um site completo para minha loja virtual..."
 *               budget:
 *                 type: object
 *                 required:
 *                   - min
 *                   - max
 *                 properties:
 *                   min:
 *                     type: number
 *                     example: 2000
 *                   max:
 *                     type: number
 *                     example: 5000
 *                   currency:
 *                     type: string
 *                     default: "BRL"
 *               category:
 *                 type: string
 *                 enum: [Desenvolvimento Web, Design UI/UX, Marketing Digital, Redação, Tradução, Consultoria, Outro]
 *                 example: "Desenvolvimento Web"
 *               timeline:
 *                 type: string
 *                 example: "2-3 semanas"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["React", "Node.js", "MongoDB"]
 *     responses:
 *       201:
 *         description: Projeto criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Apenas clientes podem criar projetos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
	'/',
	protect,
	[
		body('title').notEmpty().withMessage('Título é obrigatório'),
		body('description').notEmpty().withMessage('Descrição é obrigatória'),
		body('budget.min').isNumeric().withMessage('Orçamento mínimo deve ser um número'),
		body('budget.max').isNumeric().withMessage('Orçamento máximo deve ser um número'),
		body('category')
			.isIn([
				'Desenvolvimento Web',
				'Design UI/UX',
				'Marketing Digital',
				'Redação',
				'Tradução',
				'Consultoria',
				'Outro',
			])
			.withMessage('Categoria inválida'),
		body('timeline').notEmpty().withMessage('Prazo é obrigatório'),
		body('skills').isArray().withMessage('Habilidades devem ser um array'),
	],
	async (req, res) => {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({
					message: 'Dados inválidos',
					errors: errors.array(),
				})
			}

			// Verificar se usuário é cliente
			if (req.user.userType !== 'client') {
				return res.status(403).json({
					message: 'Apenas clientes podem criar projetos',
				})
			}

			const project = await Project.create({
				...req.body,
				client: req.user._id,
			})

			const populatedProject = await Project.findById(project._id).populate('client', 'name avatar')

			res.status(201).json(populatedProject)
		} catch (error) {
			console.error('Erro ao criar projeto:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/projects/{id}/proposals:
 *   post:
 *     summary: Enviar proposta para projeto
 *     description: Envia uma proposta para um projeto aberto (apenas freelancers)
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proposal
 *               - bid
 *               - timeline
 *             properties:
 *               proposal:
 *                 type: string
 *                 example: "Tenho experiência com desenvolvimento de e-commerce..."
 *               bid:
 *                 type: number
 *                 example: 3500
 *               timeline:
 *                 type: string
 *                 example: "3 semanas"
 *     responses:
 *       201:
 *         description: Proposta enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Proposta enviada com sucesso!"
 *       400:
 *         description: Dados inválidos ou projeto não aceita propostas
 *       403:
 *         description: Apenas freelancers podem enviar propostas
 *       404:
 *         description: Projeto não encontrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
	'/:id/proposals',
	protect,
	[
		body('proposal').notEmpty().withMessage('Proposta é obrigatória'),
		body('bid').isNumeric().withMessage('Lance deve ser um número'),
		body('timeline').notEmpty().withMessage('Prazo é obrigatório'),
	],
	async (req, res) => {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({
					message: 'Dados inválidos',
					errors: errors.array(),
				})
			}

			// Verificar se usuário é freelancer
			if (req.user.userType !== 'freelancer') {
				return res.status(403).json({
					message: 'Apenas freelancers podem enviar propostas',
				})
			}

			const project = await Project.findById(req.params.id)

			if (!project) {
				return res.status(404).json({
					message: 'Projeto não encontrado',
				})
			}

			if (project.status !== 'open') {
				return res.status(400).json({
					message: 'Projeto não está aceitando propostas',
				})
			}

			// Verificar se já enviou proposta
			const existingProposal = project.proposals.find(
				(p) => p.freelancer.toString() === req.user._id.toString(),
			)

			if (existingProposal) {
				return res.status(400).json({
					message: 'Você já enviou uma proposta para este projeto',
				})
			}

			project.proposals.push({
				freelancer: req.user._id,
				...req.body,
			})

			await project.save()

			res.status(201).json({
				message: 'Proposta enviada com sucesso!',
			})
		} catch (error) {
			console.error('Erro ao enviar proposta:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/projects/my-projects:
 *   get:
 *     summary: Buscar projetos do usuário logado
 *     description: Retorna os projetos do usuário autenticado (como cliente ou freelancer)
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de projetos do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/my-projects', protect, async (req, res) => {
	try {
		let query = {}

		if (req.user.userType === 'client') {
			query.client = req.user._id
		} else {
			query.assignedTo = req.user._id
		}

		const projects = await Project.find(query)
			.populate('client', 'name avatar')
			.populate('assignedTo', 'name avatar')
			.sort({ createdAt: -1 })

		res.json(projects)
	} catch (error) {
		console.error('Erro ao buscar projetos:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Buscar projeto por ID
 *     description: Retorna os detalhes completos de um projeto específico
 *     tags: [Projetos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Dados do projeto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Projeto não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/:id', async (req, res) => {
	try {
		const project = await Project.findById(req.params.id)
			.populate('client', 'name avatar email')
			.populate('proposals.freelancer', 'name avatar title rating')
			.populate('assignedTo', 'name avatar title')

		if (!project) {
			return res.status(404).json({
				message: 'Projeto não encontrado',
			})
		}

		res.json(project)
	} catch (error) {
		console.error('Erro ao buscar projeto:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Atualizar projeto
 *     description: Atualiza um projeto existente (apenas o cliente dono do projeto)
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *               category:
 *                 type: string
 *               timeline:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Projeto atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Apenas o cliente dono pode atualizar o projeto
 *       404:
 *         description: Projeto não encontrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put(
	'/:id',
	protect,
	[
		body('title').optional().notEmpty().withMessage('Título não pode estar vazio'),
		body('description').optional().notEmpty().withMessage('Descrição não pode estar vazia'),
		body('budget.min').optional().isNumeric().withMessage('Orçamento mínimo deve ser um número'),
		body('budget.max').optional().isNumeric().withMessage('Orçamento máximo deve ser um número'),
		body('category')
			.optional()
			.isIn([
				'Desenvolvimento Web',
				'Design UI/UX',
				'Marketing Digital',
				'Redação',
				'Tradução',
				'Consultoria',
				'Outro',
			])
			.withMessage('Categoria inválida'),
		body('status')
			.optional()
			.isIn(['open', 'in_progress', 'completed', 'cancelled'])
			.withMessage('Status inválido'),
	],
	async (req, res) => {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({
					message: 'Dados inválidos',
					errors: errors.array(),
				})
			}

			const project = await Project.findById(req.params.id)

			if (!project) {
				return res.status(404).json({
					message: 'Projeto não encontrado',
				})
			}

			// Verificar se o usuário é o cliente dono do projeto
			if (project.client.toString() !== req.user._id.toString()) {
				return res.status(403).json({
					message: 'Apenas o cliente dono do projeto pode atualizá-lo',
				})
			}

			const updatedProject = await Project.findByIdAndUpdate(
				req.params.id,
				{ $set: req.body },
				{ new: true, runValidators: true },
			).populate('client', 'name avatar')

			res.json(updatedProject)
		} catch (error) {
			console.error('Erro ao atualizar projeto:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/projects/{id}/assign:
 *   patch:
 *     summary: Atribuir projeto a freelancer
 *     description: Atribui um projeto a um freelancer (apenas cliente dono do projeto)
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - freelancerId
 *               - proposalId
 *             properties:
 *               freelancerId:
 *                 type: string
 *                 description: ID do freelancer
 *               proposalId:
 *                 type: string
 *                 description: ID da proposta aceita
 *     responses:
 *       200:
 *         description: Projeto atribuído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Apenas o cliente dono pode atribuir o projeto
 *       404:
 *         description: Projeto ou freelancer não encontrado
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.patch(
	'/:id/assign',
	protect,
	[
		body('freelancerId').notEmpty().withMessage('ID do freelancer é obrigatório'),
		body('proposalId').notEmpty().withMessage('ID da proposta é obrigatório'),
	],
	async (req, res) => {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({
					message: 'Dados inválidos',
					errors: errors.array(),
				})
			}

			const { freelancerId, proposalId } = req.body

			const project = await Project.findById(req.params.id)

			if (!project) {
				return res.status(404).json({
					message: 'Projeto não encontrado',
				})
			}

			// Verificar se o usuário é o cliente dono do projeto
			if (project.client.toString() !== req.user._id.toString()) {
				return res.status(403).json({
					message: 'Apenas o cliente dono do projeto pode atribuí-lo',
				})
			}

			// Verificar se o freelancer existe
			const freelancer = await User.findOne({
				_id: freelancerId,
				userType: 'freelancer',
			})

			if (!freelancer) {
				return res.status(404).json({
					message: 'Freelancer não encontrado',
				})
			}

			// Atualizar status da proposta e atribuir projeto
			project.assignedTo = freelancerId
			project.status = 'in_progress'

			// Atualizar status da proposta aceita
			const proposal = project.proposals.id(proposalId)
			if (proposal) {
				proposal.status = 'accepted'
			}

			await project.save()

			const updatedProject = await Project.findById(project._id)
				.populate('client', 'name avatar')
				.populate('assignedTo', 'name avatar title')
				.populate('proposals.freelancer', 'name avatar title')

			res.json(updatedProject)
		} catch (error) {
			console.error('Erro ao atribuir projeto:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

export default router
