import { sessionManager } from "../services/SessionManager";

export const cameraTools = [
  {
    name: "glasses_start_video_stream",
    description: "Start a managed video stream from the glasses. Mentra cloud hosts the RTMP endpoint and returns HLS / DASH / WebRTC playback URLs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        quality: { type: "string", enum: ["720p", "1080p"], description: "Stream quality (default 720p)" },
        enableWebRTC: { type: "boolean", description: "Enable WebRTC for low-latency viewing (default true)" },
      },
    },
    handler: async (args: any, userEmail: string) => {
      const glasses = sessionManager.getUserSession(userEmail);
      if (!glasses) return { content: [{ type: "text", text: "⚠️ Your glasses are not connected." }] };

      try {
        const result = await glasses.session.camera.startManagedStream({
          quality: args.quality ?? "720p",
          enableWebRTC: args.enableWebRTC ?? true,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Failed to start stream: ${e.message}` }], isError: true };
      }
    }
  },
  {
    name: "glasses_stop_video_stream",
    description: "Stop the current managed video stream from the glasses.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async (_args: any, userEmail: string) => {
      const glasses = sessionManager.getUserSession(userEmail);
      if (!glasses) return { content: [{ type: "text", text: "⚠️ Your glasses are not connected." }] };

      try {
        await glasses.session.camera.stopManagedStream();
        return { content: [{ type: "text", text: "Stream stopped." }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Failed to stop stream: ${e.message}` }], isError: true };
      }
    }
  },
  {
    name: "glasses_get_video_stream",
    description: "Get the URLs of the currently active managed video stream, if any.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async (_args: any, userEmail: string) => {
      const glasses = sessionManager.getUserSession(userEmail);
      if (!glasses) return { content: [{ type: "text", text: "⚠️ Your glasses are not connected." }] };

      const urls = glasses.session.camera.getManagedStreamUrls();
      if (!urls) return { content: [{ type: "text", text: "No active stream." }] };
      return { content: [{ type: "text", text: JSON.stringify(urls, null, 2) }] };
    }
  }
];
