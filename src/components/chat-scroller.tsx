// Uses shadcn/ui's actual MIT-licensed conversation primitive, with Quiet UI styles.
import { MessageScroller as Primitive } from '@shadcn/react/message-scroller'
import { ArrowDown } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
export { useMessageScroller, useMessageScrollerScrollable } from '@shadcn/react/message-scroller'
export const ChatScrollProvider = Primitive.Provider
export const ChatScrollViewport = Primitive.Viewport
export const ChatScrollContent = Primitive.Content
export const ChatScrollItem = Primitive.Item
export const ChatScrollFrame = Primitive.Root
export function ChatScrollButton({streaming}:{streaming:boolean}) {
  const reduced=useReducedMotion()
  return <Primitive.Button direction="end" behavior={reduced?'instant':'smooth'} className="button jump-latest"><ArrowDown/><span>{streaming?'Follow response':'Latest response'}</span></Primitive.Button>
}
