import { sessionManager } from "../services/SessionManager";

type StreamStatusSnapshot = {
  status: string;
  message?: string;
  streamId?: string;
  capturedAt: string;
  hlsUrl?: string;
  webrtcUrl?: string;
  previewUrl?: string;
  raw: unknown;
};

// Track the latest ManagedStreamStatus per glasses-session userId.
// The Mentra SDK pushes status updates via onManagedStreamStatus; we subscribe
// once per session and store the most recent snapshot for diagnostics.
const latestStatus = new Map<string, StreamStatusSnapshot>();
const subscribed = new Set<string>();

function ensureStatusSubscription(userId: string, glasses: any): void {
  if (subscribed.has(userId)) return;
  subscribed.add(userId);
  try {
    glasses.session.camera.onManagedStreamStatus((s: any) => {
      latestStatus.set(userId, {
        status: s.status,
        message: s.message,
        streamId: s.streamId,
        hlsUrl: s.hlsUrl,
        webrtcUrl: s.webrtcUrl,
        previewUrl: s.previewUrl,
        capturedAt: new Date().toISOString(),
        raw: s,
      });
    });
  } catch (e) {
    // SDK can throw if subscription mechanics changed; non-fatal
    console.error("[camera] onManagedStreamStatus subscribe failed", e);
  }
}

export const cameraTools = [
  {
    name: "glasses_start_video_stream",
    description: "Start a managed video stream from the glasses. Mentra cloud hosts the RTMP endpoint and returns HLS / DASH / WebRTC playback URLs. Also subscribes to stream status updates accessible via glasses_get_stream_status.",
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

      ensureStatusSubscription(glasses.userId, glasses);

      try {
        const result = await glasses.session.camera.startManagedStream({
          quality: args.quality ?? "720p",
          enableWebRTC: args.enableWebRTC ?? true,
        });
        const status = latestStatus.get(glasses.userId);
        return { content: [{ type: "text", text: JSON.stringify({ ...result, lastStatus: status }, null, 2) }] };
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
  },
  {
    name: "glasses_capture_photo",
    description: "Capture a single photo from the glasses camera (uses session.camera.requestPhoto). Returns the JPEG bytes as base64 plus capture metadata. Use this for low-fps capture when the live RTMP stream is unreliable.",
    inputSchema: {
      type: "object" as const,
      properties: {
        size: { type: "string", enum: ["small", "medium", "large", "full"], description: "Photo resolution preset (default 'small' for fast transfer)" },
        compress: { type: "string", enum: ["none", "medium", "heavy"], description: "Compression level (default 'heavy' for fastest transfer)" }
      }
    },
    handler: async (args: any, userEmail: string) => {
      const glasses = sessionManager.getUserSession(userEmail);
      if (!glasses) return { content: [{ type: "text", text: "⚠️ Your glasses are not connected." }] };

      try {
        const photo = await glasses.session.camera.requestPhoto({
          size: args.size ?? "small",
          compress: args.compress ?? "heavy"
        });
        const base64 = photo.buffer.toString("base64");
        const result = {
          base64,
          mimeType: photo.mimeType,
          filename: photo.filename,
          size: photo.size,
          capturedAtMs: photo.timestamp instanceof Date ? photo.timestamp.getTime() : Date.now()
        };
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Failed to capture photo: ${e.message}` }], isError: true };
      }
    }
  },
  {
    name: "glasses_get_stream_status",
    description: "Get the latest ManagedStreamStatus snapshot from Mentra cloud for the current glasses session. Includes status (initializing/preparing/active/stopping/stopped/error), any error message, streamId, and known playback URLs. Useful for diagnosing why playback URLs return 404.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: async (_args: any, userEmail: string) => {
      const glasses = sessionManager.getUserSession(userEmail);
      if (!glasses) return { content: [{ type: "text", text: "⚠️ Your glasses are not connected." }] };

      const status = latestStatus.get(glasses.userId);
      const isActive = glasses.session.camera.isCurrentlyStreaming?.() ?? glasses.session.camera.isManagedStreamActive?.() ?? false;

      if (!status) {
        return { content: [{ type: "text", text: JSON.stringify({ status: "no_data", isActive, message: "No status updates received yet. Start a stream first." }, null, 2) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify({ ...status, isActive }, null, 2) }] };
    }
  }
];
