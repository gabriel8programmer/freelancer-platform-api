// models/Payment.js
import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
	{
		project: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Project',
			required: true,
		},
		client: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		freelancer: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		currency: {
			type: String,
			default: 'BRL',
		},
		status: {
			type: String,
			enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
			default: 'pending',
		},
		paymentMethod: {
			type: String,
			enum: ['credit_card', 'debit_card', 'pix', 'bank_transfer', 'paypal', 'crypto'],
			required: true,
		},
		paymentIntentId: {
			type: String,
			// Para integração com gateways de pagamento
		},
		description: {
			type: String,
			required: true,
		},
		dueDate: {
			type: Date,
			required: true,
		},
		paidAt: {
			type: Date,
		},
		// Para pagamentos parcelados
		installment: {
			current: {
				type: Number,
				default: 1,
			},
			total: {
				type: Number,
				default: 1,
			},
		},
		// Metadados para diferentes gateways
		metadata: {
			type: Object,
			default: {},
		},
		// Para rastreamento de transações
		transactionId: {
			type: String,
		},
		// URL do boleto ou PIX
		paymentUrl: {
			type: String,
		},
		// Código PIX
		pixCode: {
			type: String,
		},
		// Para reembolsos
		refundReason: {
			type: String,
		},
		refundedAt: {
			type: Date,
		},
	},
	{
		timestamps: true,
	},
)

// Índices para buscas eficientes
paymentSchema.index({ project: 1 })
paymentSchema.index({ client: 1 })
paymentSchema.index({ freelancer: 1 })
paymentSchema.index({ status: 1 })
paymentSchema.index({ createdAt: -1 })

// Virtual para verificar se está atrasado
paymentSchema.virtual('isOverdue').get(function () {
	return this.status === 'pending' && new Date() > this.dueDate
})

// Método para marcar como pago
paymentSchema.methods.markAsPaid = function (transactionId = null) {
	this.status = 'completed'
	this.paidAt = new Date()
	if (transactionId) {
		this.transactionId = transactionId
	}
	return this.save()
}

// Método para processar reembolso
paymentSchema.methods.processRefund = function (reason) {
	this.status = 'refunded'
	this.refundReason = reason
	this.refundedAt = new Date()
	return this.save()
}

// Middleware para atualizar projeto quando pagamento é concluído
paymentSchema.post('save', async function (doc) {
	if (doc.status === 'completed') {
		const Project = mongoose.model('Project')
		await Project.findByIdAndUpdate(doc.project, {
			status: 'completed',
			$set: { 'budget.paidAmount': doc.amount },
		})
	}
})

export default mongoose.model('Payment', paymentSchema)
