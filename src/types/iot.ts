export interface IoTMessage {
  deviceId: string
  ts: string
  msgType: string
  payload: string
  qos: string
  retain: string
  topic: string
}

export interface ParsedIoTMessage extends Omit<IoTMessage, 'payload'> {
  payload: any
}
