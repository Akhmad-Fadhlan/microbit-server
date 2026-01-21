/***************************************************
 * ESP8266 MakeCode Library + LED DEBUGG
 ***************************************************/
namespace esp8266 {
    let esp8266Initialized = false
    let rxData = ""

    function debug(msg: string) {
        basic.showString(msg)
        basic.pause(300)
    }

    function error(code: number) {
        basic.showIcon(IconNames.No)
        basic.showNumber(code)
        basic.pause(2000)
    }

    //% blockHidden=true
    export function sendCommand(
        command: string,
        expected: string = null,
        timeout: number = 1000
    ): boolean {
        rxData = ""
        serial.readString()
        serial.writeString(command + "\r\n")

        if (expected == null) return true

        let start = input.runningTime()
        while (input.runningTime() - start < timeout) {
            rxData += serial.readString()
            if (rxData.indexOf(expected) >= 0) return true
            if (rxData.indexOf("ERROR") >= 0) return false
        }
        return false
    }

    //% weight=30
    //% block="initialize ESP8266 Tx %tx Rx %rx Baud %baudrate"
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        debug("I")
        serial.redirect(tx, rx, baudrate)

        if (!sendCommand("AT+RST", "ready", 5000)) {
            error(1); return
        }

        if (!sendCommand("ATE0", "OK")) {
            error(2); return
        }

        if (!sendCommand("AT+CWMODE=1", "OK")) {
            error(3); return
        }

        esp8266Initialized = true
        basic.showIcon(IconNames.Yes)
    }

    //% weight=25
    //% block="send to server IP %serverIp WiFi %ssid Pass %password Data %data"
    export function sendToServer(
        serverIp: string,
        ssid: string,
        password: string,
        data: string
    ) {
        if (!esp8266Initialized) {
            error(0); return
        }

        // WiFi
        debug("W")
        if (!sendCommand(
            "AT+CWJAP=\"" + ssid + "\",\"" + password + "\"",
            "WIFI GOT IP",
            20000
        )) {
            error(4); return
        }

        // TCP
        debug("C")
        if (!sendCommand(
            "AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80",
            "CONNECT",
            8000
        )) {
            error(5); return
        }

        // SEND
        debug("S")
        let httpRequest =
            "GET /tes.php?" + data + " HTTP/1.1\r\n" +
            "Host: " + serverIp + "\r\n" +
            "Connection: close\r\n\r\n"

        let len = httpRequest.length + 2

        if (!sendCommand("AT+CIPSEND=" + len, ">", 5000)) {
            error(6); return
        }

        debug("D")
        serial.writeString(httpRequest)

        basic.pause(4000)
        sendCommand("AT+CIPCLOSE")

        basic.showIcon(IconNames.Yes)
    }
}
