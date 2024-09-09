## Endpoints

### 1. Get All Ships

- **URL**: `/`
- **Method**: `GET`
- **Query Parameters**:
  - `page` (integer, optional, default: `1`): Page number for pagination.
  - `limit` (integer, optional, default: `5`): Number of records per page.
- **Responses**:
  - **200 OK**: Returns a paginated list of all ships.
    - **Example Request**:
      ```http
      GET /api/ships?page=2&limit=10
      ```
    - **Example Response**:
      ```json
      {
        "data": [
          {
            "mmsi": "123456789",
            "name": "Ship A",
            "imo": "IMO1234567",
            "callsign": "CALLSIGN1"
          }
        ],
        "meta": {
          "totalRows": 50,
          "currentPage": 2,
          "totalPages": 5
        }
      }
      ```
  - **500 Internal Server Error**: Problem fetching data from the database.

### 2. Get Ship by MMSI

- **URL**: `/mmsi/:mmsi`
- **Method**: `GET`
- **Path Parameters**:
  - `mmsi` (string, required): The MMSI of the ship.
- **Responses**:
  - **200 OK**: Returns the ship data for the given MMSI.
    - **Example Request**:
      ```http
      GET /api/ships/mmsi/123456789
      ```
    - **Example Response**:
      ```json
      {
        "mmsi": "123456789",
        "name": "Ship A",
        "imo": "IMO1234567",
        "callsign": "CALLSIGN1"
      }
      ```
  - **404 Not Found**: Ship not found.
  - **500 Internal Server Error**: Server error.

### 3. Get Ship by IMO

- **URL**: `/imo/:imo`
- **Method**: `GET`
- **Path Parameters**:
  - `imo` (string, required): The IMO of the ship.
- **Responses**:
  - **200 OK**: Returns the ship data for the given IMO.
    - **Example Request**:
      ```http
      GET /api/ships/imo/IMO1234567
      ```
    - **Example Response**:
      ```json
      {
        "mmsi": "123456789",
        "name": "Ship A",
        "imo": "IMO1234567",
        "callsign": "CALLSIGN1"
      }
      ```
  - **404 Not Found**: Ship not found.
  - **500 Internal Server Error**: Server error.

### 4. Get Ship by Name

- **URL**: `/name/:name`
- **Method**: `GET`
- **Path Parameters**:
  - `name` (string, required): The name of the ship.
- **Responses**:
  - **200 OK**: Returns the ship data for the given name.
    - **Example Request**:
      ```http
      GET /api/ships/name/ShipA
      ```
    - **Example Response**:
      ```json
      {
        "mmsi": "123456789",
        "name": "Ship A",
        "imo": "IMO1234567",
        "callsign": "CALLSIGN1"
      }
      ```
  - **404 Not Found**: Ship not found.
  - **500 Internal Server Error**: Server error.

### 5. Get Ship by Call Sign

- **URL**: `/callsign/:callsign`
- **Method**: `GET`
- **Path Parameters**:
  - `callsign` (string, required): The call sign of the ship.
- **Responses**:
  - **200 OK**: Returns the ship data for the given call sign.
    - **Example Request**:
      ```http
      GET /api/ships/callsign/CALLSIGN1
      ```
    - **Example Response**:
      ```json
      {
        "mmsi": "123456789",
        "name": "Ship A",
        "imo": "IMO1234567",
        "callsign": "CALLSIGN1"
      }
      ```
  - **400 Bad Request**: Invalid or missing call sign parameter.
    - **Example Response**:
      ```json
      {
        "error": "Invalid or missing callSign parameter"
      }
      ```
  - **404 Not Found**: Ship not found.
  - **500 Internal Server Error**: Server error.

### 6. Get Ship by MMSI and IMO

- **URL**: `/:mmsi/:imo`
- **Method**: `GET`
- **Path Parameters**:
  - `mmsi` (string, required): The MMSI of the ship.
  - `imo` (string, required): The IMO of the ship.
- **Responses**:
  - **200 OK**: Returns the ship data for the given MMSI and IMO.
    - **Example Request**:
      ```http
      GET /api/ships/123456789/IMO1234567
      ```
    - **Example Response**:
      ```json
      {
        "mmsi": "123456789",
        "name": "Ship A",
        "imo": "IMO1234567",
        "callsign": "CALLSIGN1"
      }
      ```
  - **500 Internal Server Error**: Server error.

### 7. Fetch Ships by Time Range

- **URL**: `/time/:start_time/:end_time`
- **Method**: `GET`
- **Path Parameters**:
  - `start_time` (string, required): The start time in ISO format.
  - `end_time` (string, required): The end time in ISO format.
- **Query Parameters**:
  - `timeZone` (string, optional, default: `UTC`): The time zone for the date conversion.
- **Responses**:
  - **200 OK**: Returns the ships found within the specified time range.
    - **Example Request**:
      ```http
      GET /api/ships/time/2023-09-01T00:00:00Z/2023-09-05T23:59:59Z?timeZone=UTC
      ```
    - **Example Response**:
      ```json
      [
        {
          "mmsi": "123456789",
          "name": "Ship A",
          "imo": "IMO1234567",
          "callsign": "CALLSIGN1"
        }
      ]
      ```
  - **400 Bad Request**: Invalid date format.
    - **Example Response**:
      ```json
      {
        "error": "Invalid date format"
      }
      ```
  - **404 Not Found**: No ships found within the specified time range.
    - **Example Response**:
      ```json
      {
        "message": "No ships found within the specified time range."
      }
      ```
  - **500 Internal Server Error**: Server error.
