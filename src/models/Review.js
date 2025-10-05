// models/Review.js
import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
	{
		project: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Project',
			required: true,
		},
		reviewer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		reviewed: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		reviewType: {
			type: String,
			enum: ['client_to_freelancer', 'freelancer_to_client'],
			required: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		comment: {
			type: String,
			required: true,
			trim: true,
		},
	},
	{
		timestamps: true,
	},
)

// Índice composto para evitar avaliações duplicadas
reviewSchema.index({ project: 1, reviewer: 1, reviewType: 1 }, { unique: true })

export default mongoose.model('Review', reviewSchema)
