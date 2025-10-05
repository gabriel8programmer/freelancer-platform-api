// routes/reviews.js
import express from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth.js'
import Review from '../models/Review.js'
import Project from '../models/Project.js'
import User from '../models/User.js'

const router = express.Router()

/**
 * @swagger
 * /api/reviews/project/{projectId}:
 *   post:
 *     summary: Avaliar projeto concluído
 *     description: Cliente ou freelancer avalia o projeto finalizado
 *     tags: [Avaliações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Excelente trabalho! Muito profissional."
 *     responses:
 *       201:
 *         description: Avaliação criada com sucesso
 *       400:
 *         description: Dados inválidos ou projeto não pode ser avaliado
 *       403:
 *         description: Apenas participantes do projeto podem avaliar
 *       500:
 *         description: Erro interno do servidor
 */
router.post(
	'/project/:projectId',
	protect,
	[
		body('rating').isInt({ min: 1, max: 5 }).withMessage('Avaliação deve ser entre 1 e 5'),
		body('comment').notEmpty().withMessage('Comentário é obrigatório'),
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

			const { projectId } = req.params
			const { rating, comment } = req.body

			const project = await Project.findById(projectId)

			if (!project) {
				return res.status(404).json({
					message: 'Projeto não encontrado',
				})
			}

			// Verificar se o projeto está concluído
			if (project.status !== 'completed') {
				return res.status(400).json({
					message: 'Apenas projetos concluídos podem ser avaliados',
				})
			}

			// Verificar se o usuário é participante do projeto
			const isClient = project.client.toString() === req.user._id.toString()
			const isFreelancer =
				project.assignedTo && project.assignedTo.toString() === req.user._id.toString()

			if (!isClient && !isFreelancer) {
				return res.status(403).json({
					message: 'Apenas participantes do projeto podem avaliá-lo',
				})
			}

			// Determinar quem está avaliando e quem está sendo avaliado
			const reviewer = req.user._id
			const reviewed = isClient ? project.assignedTo : project.client
			const reviewType = isClient ? 'client_to_freelancer' : 'freelancer_to_client'

			// Verificar se já avaliou
			const existingReview = await Review.findOne({
				project: projectId,
				reviewer,
				reviewType,
			})

			if (existingReview) {
				return res.status(400).json({
					message: 'Você já avaliou este projeto',
				})
			}

			// Criar avaliação
			const review = await Review.create({
				project: projectId,
				reviewer,
				reviewed,
				reviewType,
				rating,
				comment,
			})

			// Atualizar rating médio do usuário avaliado
			await updateUserRating(reviewed)

			res.status(201).json(review)
		} catch (error) {
			console.error('Erro ao criar avaliação:', error)
			res.status(500).json({
				message: 'Erro interno do servidor',
			})
		}
	},
)

/**
 * @swagger
 * /api/reviews/user/{userId}:
 *   get:
 *     summary: Buscar avaliações do usuário
 *     description: Retorna todas as avaliações de um usuário
 *     tags: [Avaliações]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de avaliações
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       rating:
 *                         type: integer
 *                       comment:
 *                         type: string
 *                       reviewer:
 *                         $ref: '#/components/schemas/User'
 *                       project:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           title:
 *                             type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/user/:userId', async (req, res) => {
	try {
		const { userId } = req.params
		const { page = 1, limit = 10 } = req.query

		// Verificar se usuário existe
		const user = await User.findById(userId)
		if (!user) {
			return res.status(404).json({
				message: 'Usuário não encontrado',
			})
		}

		const reviews = await Review.find({ reviewed: userId })
			.populate('reviewer', 'name avatar title')
			.populate('project', 'title')
			.sort({ createdAt: -1 })
			.limit(limit * 1)
			.skip((page - 1) * limit)

		const total = await Review.countDocuments({ reviewed: userId })

		res.json({
			reviews,
			totalPages: Math.ceil(total / limit),
			currentPage: parseInt(page),
			total,
		})
	} catch (error) {
		console.error('Erro ao buscar avaliações:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

// Função auxiliar para atualizar rating do usuário
async function updateUserRating(userId) {
	const stats = await Review.aggregate([
		{ $match: { reviewed: userId } },
		{
			$group: {
				_id: '$reviewed',
				averageRating: { $avg: '$rating' },
				totalReviews: { $sum: 1 },
			},
		},
	])

	if (stats.length > 0) {
		await User.findByIdAndUpdate(userId, {
			rating: Math.round(stats[0].averageRating * 10) / 10,
			completedProjects: stats[0].totalReviews,
		})
	}
}

export default router
