import { Check } from 'lucide-react'
import type { OrderStatus } from '../../types'

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'PENDING',          label: 'Order Placed'    },
  { status: 'CONFIRMED',        label: 'Confirmed'       },
  { status: 'PROCESSING',       label: 'Processing'      },
  { status: 'SHIPPED',          label: 'Shipped'         },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery'},
  { status: 'DELIVERED',        label: 'Delivered'       },
]

const CANCELLED_STATUSES: OrderStatus[] = [
  'CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED',
  'RETURN_REJECTED', 'REFUNDED',
]

interface Props {
  status: OrderStatus
}

export default function OrderTimeline({ status }: Props) {
  const isCancelled = CANCELLED_STATUSES.includes(status)

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl
                      bg-red-400/10 border border-red-400/20">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-400 font-display">
            {status === 'CANCELLED'        ? 'Order Cancelled'      :
             status === 'RETURN_REQUESTED' ? 'Return Requested'     :
             status === 'RETURN_APPROVED'  ? 'Return Approved'      :
             status === 'RETURN_REJECTED'  ? 'Return Rejected'      :
             'Refunded'}
          </p>
          <p className="text-xs text-red-400/70 font-body mt-0.5">
            This order is no longer in progress
          </p>
        </div>
      </div>
    )
  }

  const currentIdx = TIMELINE_STEPS.findIndex(s => s.status === status)

  return (
    <div className="relative">
      {TIMELINE_STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx
        const isCurrent   = idx === currentIdx
        const isFuture    = idx > currentIdx

        return (
          <div key={step.status} className="flex items-start gap-4">

            {/* Left — circle + line */}
            <div className="flex flex-col items-center flex-shrink-0">

              {/* Circle */}
              <div className={`relative w-8 h-8 rounded-full flex items-center
                               justify-center border-2 transition-all
                               ${isCompleted
                                 ? 'bg-violet-600 border-violet-600'
                                 : isCurrent
                                   ? 'bg-transparent border-violet-500'
                                   : 'bg-transparent border-slate-700'}`}>
                {isCompleted && (
                  <Check size={14} className="text-white" />
                )}
                {isCurrent && (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 block" />
                    {/* Pulse ring */}
                    <span className="absolute inset-0 rounded-full border-2
                                     border-violet-500 animate-ping opacity-40" />
                  </>
                )}
              </div>

              {/* Connector line — not shown after last step */}
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-8 mt-1
                                 ${isCompleted
                                   ? 'bg-violet-600'
                                   : 'bg-slate-700 border-dashed'}`} />
              )}
            </div>

            {/* Right — label */}
            <div className="pb-8 pt-1">
              <p className={`text-sm font-medium font-display
                             ${isCompleted ? 'text-violet-300'  :
                               isCurrent   ? 'text-white'       :
                               isFuture    ? 'text-slate-600'   : ''}`}>
                {step.label}
              </p>
              {isCurrent && (
                <p className="text-xs text-slate-500 font-body mt-0.5">
                  Current status
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}