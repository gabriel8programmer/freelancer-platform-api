// routes/users.js
import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.js'
import User from '../models/User.js'

const router = express.Router()

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Atualizar perfil do usuário
 *     description: Atualiza as informações do perfil do usuário logado
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva Santos"
 *               title:
 *                 type: string
 *                 example: "Desenvolvedor Full Stack"
 *               bio:
 *                 type: string
 *                 example: "Desenvolvedor com 5 anos de experiência..."
 *               hourlyRate:
 *                 type: number
 *                 example: 85
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["React", "Node.js", "MongoDB"]
 *               portfolio:
 *                 type: string
 *                 format: url
 *                 example: "https://meuportfolio.com"
 *               location:
 *                 type: string
 *                 example: "São Paulo, SP"
 *               phone:
 *                 type: string
 *                 example: "(11) 99999-9999"
 *               experience:
 *                 type: string
 *                 enum: [junior, pleno, senior]
 *                 example: "senior"
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.put(
	'/profile',
	protect,
	[
		body('name').optional().notEmpty().withMessage('Nome não pode estar vazio'),
		body('title').optional().trim(),
		body('bio').optional().trim(),
		body('hourlyRate').optional().isNumeric().withMessage('Taxa por hora deve ser um número'),
		body('skills').optional(),
		body('portfolio').optional().isURL().withMessage('Portfólio deve ser uma URL válida'),
		body('location').optional().trim(),
		body('phone').optional().trim(),
		body('experience')
			.optional()
			.isIn(['junior', 'pleno', 'senior'])
			.withMessage('Experiência inválida'),
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

			const {
				name,
				title,
				bio,
				hourlyRate,
				skills,
				portfolio,
				location,
				phone,
				experience,
				company,
				website,
			} = req.body

			const updateData = {}
			if (name) updateData.name = name
			if (title) updateData.title = title
			if (bio) updateData.bio = bio
			if (hourlyRate) updateData.hourlyRate = hourlyRate
			if (skills)
				updateData.skills =
					typeof skills === 'string' ? skills.split(',').map((s) => s.trim()) : skills
			if (portfolio) updateData.portfolio = portfolio
			if (location) updateData.location = location
			if (phone) updateData.phone = phone
			if (experience) updateData.experience = experience
			if (company) updateData.company = company
			if (website) updateData.website = website

			updateData.profileComplete = true

			const user = await User.findByIdAndUpdate(
				req.user._id,
				{ $set: updateData },
				{ new: true, runValidators: true },
			)

			res.json(user)
		} catch (error) {
			console.error('Erro ao atualizar perfil:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/users/freelancers:
 *   get:
 *     summary: Buscar todos os freelancers
 *     description: Retorna uma lista paginada de freelancers com filtros opcionais
 *     tags: [Usuários]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo para busca por nome, título ou bio
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
 *     responses:
 *       200:
 *         description: Lista de freelancers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 freelancers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/freelancers', async (req, res) => {
	try {
		const { search, skills, page = 1, limit = 10 } = req.query

		let query = { userType: 'freelancer', profileComplete: true }

		if (search) {
			query.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ title: { $regex: search, $options: 'i' } },
				{ bio: { $regex: search, $options: 'i' } },
			]
		}

		if (skills) {
			const skillsArray = skills.split(',').map((skill) => skill.trim())
			query.skills = { $in: skillsArray }
		}

		const freelancers = await User.find(query)
			.select('name avatar title bio hourlyRate skills rating completedProjects location')
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.sort({ rating: -1, completedProjects: -1 })

		const total = await User.countDocuments(query)

		res.json({
			freelancers,
			totalPages: Math.ceil(total / limit),
			currentPage: page,
			total,
		})
	} catch (error) {
		console.error('Erro ao buscar freelancers:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/users/freelancers/{id}:
 *   get:
 *     summary: Buscar freelancer por ID
 *     description: Retorna os detalhes completos de um freelancer específico
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do freelancer
 *     responses:
 *       200:
 *         description: Dados do freelancer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Freelancer não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/freelancers/:id', async (req, res) => {
	try {
		const freelancer = await User.findOne({
			_id: req.params.id,
			userType: 'freelancer',
		}).select('-password')

		if (!freelancer) {
			return res.status(404).json({
				message: 'Freelancer não encontrado',
			})
		}

		res.json(freelancer)
	} catch (error) {
		console.error('Erro ao buscar freelancer:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

export default router
