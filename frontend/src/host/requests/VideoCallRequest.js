import { httpPostRequest, httpGetRequest } from "../Host";

export const getVideoToken = (roomName, participantName) =>
    httpPostRequest("/videocall/token", { roomName, participantName });

export const endVideoCall = (roomName) =>
    httpPostRequest("/videocall/end", { roomName });

export const getOnlineDoctors = () =>
    httpGetRequest("/videocall/doctors");

export const createVideoConference = (data) =>
    httpPostRequest("/videocall/conferences", data);

export const getVideoConferences = () =>
    httpGetRequest("/videocall/conferences");

export const getVideoConferenceDetail = (id) =>
    httpGetRequest(`/videocall/conferences/${id}`);

export const getVideoConferenceToken = (id) =>
    httpPostRequest(`/videocall/conferences/${id}/token`, {});

export const endVideoConference = (id) =>
    httpPostRequest(`/videocall/conferences/${id}/end`, {});
