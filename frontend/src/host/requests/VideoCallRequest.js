import { httpPostRequest, httpGetRequest } from "../Host";

export const getVideoToken = (roomName, participantName) =>
    httpPostRequest("/videocall/token", { roomName, participantName });

export const endVideoCall = (roomName) =>
    httpPostRequest("/videocall/end", { roomName });

export const getOnlineDoctors = () =>
    httpGetRequest("/videocall/doctors");
