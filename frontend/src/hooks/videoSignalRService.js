// SignalR hub metodlarini global saqlaydigan service
// useVideoSignalR hook ulanganda bu metodlar to'ldiriladi

let _methods = { initiateCall: null, acceptCall: null, endCall: null, initiateConsultationCall: null };

export const setHubMethods = (methods) => {
    _methods = methods;
};

export const initiateCall = (recipientUserId, roomName) =>
    _methods.initiateCall?.(recipientUserId, roomName);

export const acceptCall = (roomName) =>
    _methods.acceptCall?.(roomName);

export const endCall = (roomName) =>
    _methods.endCall?.(roomName);

export const initiateConsultationCall = (consultationId, roomName) =>
    _methods.initiateConsultationCall?.(consultationId, roomName);
