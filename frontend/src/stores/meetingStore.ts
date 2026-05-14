import { create } from 'zustand';

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  joinedAt: Date;
  isAudioOn: boolean;
  isVideoOn: boolean;
}

interface MeetingState {
  currentMeetingId: string | null;
  participants: Participant[];
  isRecording: boolean;
  recordingStartedAt: Date | null;
  transcript: string | null;
  summary: string | null;
  actionItems: any[];
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;

  // Actions
  setCurrentMeeting: (meetingId: string) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  setParticipants: (participants: Participant[]) => void;
  startRecording: () => void;
  stopRecording: () => void;
  setTranscript: (transcript: string) => void;
  setSummary: (summary: string) => void;
  setActionItems: (items: any[]) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  endMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  currentMeetingId: null,
  participants: [],
  isRecording: false,
  recordingStartedAt: null,
  transcript: null,
  summary: null,
  actionItems: [],
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,

  setCurrentMeeting: (meetingId) => set({ currentMeetingId: meetingId }),

  addParticipant: (participant) =>
    set((state) => {
      const exists = state.participants.some((p) => p.id === participant.id);
      if (exists) return state;
      return { participants: [...state.participants, participant] };
    }),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== userId),
    })),

  setParticipants: (participants) => set({ participants }),

  startRecording: () =>
    set({ isRecording: true, recordingStartedAt: new Date() }),

  stopRecording: () =>
    set({ isRecording: false, recordingStartedAt: null }),

  setTranscript: (transcript) => set({ transcript }),

  setSummary: (summary) => set({ summary }),

  setActionItems: (items) => set({ actionItems: items }),

  toggleAudio: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleVideo: () => set((state) => ({ isVideoOff: !state.isVideoOff })),

  toggleScreenShare: () =>
    set((state) => ({ isScreenSharing: !state.isScreenSharing })),

  endMeeting: () =>
    set({
      currentMeetingId: null,
      participants: [],
      isRecording: false,
      recordingStartedAt: null,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
    }),
}));
