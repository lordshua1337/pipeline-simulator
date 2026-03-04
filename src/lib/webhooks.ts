// Pipeline Simulator -- Webhook Stubs
// These will be connected to Image Forge in the post-build connection pass.

export async function sendPipelineReady(data: {
  readonly pipelineId: string
  readonly product: string
  readonly stage: string
}): Promise<{ readonly status: string; readonly sent: boolean }> {
  // Stub: no downstream configured yet
  console.log('[WEBHOOK STUB] No downstream URL for pipeline-ready')
  return { status: 'stubbed', sent: false }
}
