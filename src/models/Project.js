// models/Project.js
import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: [true, 'Título é obrigatório'],
			trim: true,
		},
		description: {
			type: String,
			required: [true, 'Descrição é obrigatória'],
		},
		client: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		budget: {
			min: {
				type: Number,
				required: true,
			},
			max: {
				type: Number,
				required: true,
			},
			currency: {
				type: String,
				default: 'BRL',
			},
		},
		skills: [String],
		category: {
			type: String,
			required: true,
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
		timeline: {
			type: String,
			required: true,
		},
		status: {
			type: String,
			enum: ['open', 'in_progress', 'completed', 'cancelled'],
			default: 'open',
		},
		proposals: [
			{
				freelancer: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User',
				},
				proposal: String,
				bid: Number,
				timeline: String,
				status: {
					type: String,
					enum: ['pending', 'accepted', 'rejected'],
					default: 'pending',
				},
				createdAt: {
					type: Date,
					default: Date.now,
				},
			},
		],
		assignedTo: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
		},
	},
	{
		timestamps: true,
	},
)

// Index para busca
projectSchema.index({ title: 'text', description: 'text', skills: 'text' })

export default mongoose.model('Project', projectSchema)
