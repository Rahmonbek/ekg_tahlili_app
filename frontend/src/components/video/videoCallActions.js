import { getVideoToken, endVideoCall } from '../../host/requests/VideoCallRequest';
import { acceptCall, endCall } from '../../hooks/videoSignalRService';

export const getVideoTargetPath = (call, user) => {
    if (call?.consultationId) {
        return user?.roleId === 4
            ? `/doctor/consultations/${call.consultationId}`
            : `/consultations/${call.consultationId}`;
    }

    return '/video-conference';
};

export const acceptIncomingVideoCall = async ({ incomingCall, activeRoom, user, setVideoCall, navigate }) => {
    if (!incomingCall?.roomName) return;

    if (activeRoom?.roomName && activeRoom.roomName !== incomingCall.roomName) {
        try { await endCall(activeRoom.roomName); } catch { }
        try { await endVideoCall(activeRoom.roomName); } catch { }
    }

    const myName = user?.doctor
        ? `${user.doctor.firstName ?? ''} ${user.doctor.lastName ?? ''}`.trim()
        : user?.username ?? 'User';

    const res = await getVideoToken(incomingCall.roomName, myName);
    const { token, liveKitUrl } = res.data;

    await acceptCall(incomingCall.roomName);

    setVideoCall({
        incomingCall: null,
        isCalling: false,
        activeRoom: {
            roomName: incomingCall.roomName,
            token,
            liveKitUrl,
            consultationId: incomingCall.consultationId ?? null,
            peerName: incomingCall.initiatorName ?? null,
            sessionId: incomingCall.sessionId ?? null,
        },
    });

    navigate(getVideoTargetPath(incomingCall, user));
};

export const rejectIncomingVideoCall = async ({ incomingCall, setVideoCall }) => {
    if (!incomingCall?.roomName) return;

    try { await endCall(incomingCall.roomName); } catch { }
    try { await endVideoCall(incomingCall.roomName); } catch { }
    setVideoCall({ incomingCall: null });
};

export const navigateToActiveVideoCall = ({ activeRoom, user, navigate }) => {
    navigate(getVideoTargetPath(activeRoom, user));
};
