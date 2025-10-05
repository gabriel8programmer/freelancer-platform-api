// routes/dashboard.js
import express from 'express'
import { protect } from '../middleware/auth.js'
import Project from '../models/Project.js'
import Review from '../models/Review.js'

const router = express.Router()

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Estatísticas do dashboard
 *     description: Retorna estatísticas para o dashboard do usuário
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas do dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userType:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalProjects:
 *                       type: integer
 *                     activeProjects:
 *                       type: integer
 *                     completedProjects:
 *                       type: integer
 *                     totalEarnings:
 *                       type: number
 *                     pendingProposals:
 *                       type: integer
 *                     acceptedProposals:
 *                       type: integer
 *                     rating:
 *                       type: number
 *                     totalReviews:
 *                       type: integer
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/stats', protect, async (req, res) => {
	try {
		const userId = req.user._id
		const userType = req.user.userType

		let stats = {}

		if (userType === 'freelancer') {
			// Estatísticas para freelancer
			const [
				totalProjects,
				activeProjects,
				completedProjects,
				pendingProposals,
				acceptedProposals,
				earnings,
			] = await Promise.all([
				// Projetos atribuídos
				Project.countDocuments({ assignedTo: userId }),
				Project.countDocuments({ assignedTo: userId, status: 'in_progress' }),
				Project.countDocuments({ assignedTo: userId, status: 'completed' }),
				// Propostas pendentes
				Project.countDocuments({
					'proposals.freelancer': userId,
					'proposals.status': 'pending',
				}),
				// Propostas aceitas
				Project.countDocuments({
					'proposals.freelancer': userId,
					'proposals.status': 'accepted',
				}),
				// Ganhos totais (simulado - baseado em propostas aceitas)
				Project.aggregate([
					{
						$match: {
							'proposals.freelancer': userId,
							'proposals.status': 'accepted',
						},
					},
					{ $unwind: '$proposals' },
					{
						$match: {
							'proposals.freelancer': userId,
							'proposals.status': 'accepted',
						},
					},
					{
						$group: {
							_id: null,
							totalEarnings: { $sum: '$proposals.bid' },
						},
					},
				]),
			])

			stats = {
				totalProjects,
				activeProjects,
				completedProjects,
				pendingProposals,
				acceptedProposals,
				totalEarnings: earnings[0]?.totalEarnings || 0,
				rating: req.user.rating || 0,
				totalReviews: req.user.completedProjects || 0,
			}
		} else {
			// Estatísticas para cliente
			const [totalProjects, activeProjects, completedProjects, openProjects, totalProposals] =
				await Promise.all([
					Project.countDocuments({ client: userId }),
					Project.countDocuments({ client: userId, status: 'in_progress' }),
					Project.countDocuments({ client: userId, status: 'completed' }),
					Project.countDocuments({ client: userId, status: 'open' }),
					Project.aggregate([
						{ $match: { client: userId } },
						{ $unwind: '$proposals' },
						{
							$group: {
								_id: null,
								totalProposals: { $sum: 1 },
							},
						},
					]),
				])

			stats = {
				totalProjects,
				activeProjects,
				completedProjects,
				openProjects,
				totalProposals: totalProposals[0]?.totalProposals || 0,
			}
		}

		res.json({
			userType,
			stats,
		})
	} catch (error) {
		console.error('Erro ao buscar estatísticas:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

/**
 * @swagger
 * /api/dashboard/recent-activity:
 *   get:
 *     summary: Atividade recente
 *     description: Retorna a atividade recente do usuário
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de atividades recentes
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/recent-activity', protect, async (req, res) => {
	try {
		const userId = req.user._id

		let activities = []

		if (req.user.userType === 'freelancer') {
			// Atividade recente para freelancer
			const recentProjects = await Project.find({
				$or: [{ assignedTo: userId }, { 'proposals.freelancer': userId }],
			})
				.populate('client', 'name avatar')
				.sort({ updatedAt: -1 })
				.limit(5)

			activities = recentProjects.map((project) => ({
				type:
					project.assignedTo?.toString() === userId.toString()
						? 'project_assigned'
						: 'proposal_sent',
				project: {
					_id: project._id,
					title: project.title,
					status: project.status,
				},
				client: project.client,
				date: project.updatedAt,
			}))
		} else {
			// Atividade recente para cliente
			const recentProjects = await Project.find({ client: userId })
				.populate('assignedTo', 'name avatar title')
				.sort({ updatedAt: -1 })
				.limit(5)

			activities = recentProjects.map((project) => ({
				type: 'project_updated',
				project: {
					_id: project._id,
					title: project.title,
					status: project.status,
				},
				freelancer: project.assignedTo,
				date: project.updatedAt,
			}))
		}

		res.json(activities)
	} catch (error) {
		console.error('Erro ao buscar atividade recente:', error)
		res.status(500).json({
			message: 'Erro interno do servidor',
		})
	}
})

export default router
