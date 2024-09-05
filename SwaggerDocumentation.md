# API Documentation

## Get Polygon

**GET** `/api/region-marking/getPolygon/:id`

Retrieve a polygon's details by ID.

### Parameters

- **Path Parameters:**
  - `id` (string, required): The unique identifier of the polygon.

### Responses

- **200 OK:**
  - Description: Polygon retrieved successfully.
  - Content:
    ```json
    {
    "gpolygonid": "e0a62b12-96c5-45a9-9cb7-3e4505f04aa2",
    "gpolygonname": "Zone new",
    "gpolygon": "POLYGON((30 70,32.5 72.5,34 75,31 77.5003,30 70))"
    }
    ```

- **404 Not Found:**
  - Description: Polygon not found.
  - Content:
    ```json
    {
      "message": "Polygon not found"
    }
    ```

- **500 Internal Server Error:**
  - Description: Server error.
  - Content:
    ```json
    {
      "message": "Server Error"
    }
    ```

---


## Get Geocircle

**GET** `/api/region-marking/getCircle/:id`

Retrieve a geocircle's details by ID.

### Parameters

- **Path Parameters:**
  - `id` (string, required): The unique identifier of the geocircle.

### Responses

- **200 OK:**
  - Description: Geocircle retrieved successfully.
  - Content:
    ```json
    {
      "gcircleid": "123e4567-e89b-12d3-a456-426614174000",
      "gcirclename": "Example Circle",
      "gcenter": "POINT(1 1)",
      "gradius": 1000
    }
    ```

- **404 Not Found:**
  - Description: Geocircle not found.
  - Content:
    ```json
    {
      "message": "Geocircle not found"
    }
    ```

- **500 Internal Server Error:**
  - Description: Server error.
  - Content:
    ```json
    {
      "message": "Error retrieving geocircle"
    }
    ```

---

## Get Geoline

**GET** `/api/region-marking/getLine/:id`

Retrieve a geoline's details by ID.

### Parameters

- **Path Parameters:**
  - `id` (string, required): The unique identifier of the geoline.

### Responses

- **200 OK:**
  - Description: Geoline retrieved successfully.
  - Content:
    ```json
    {
      "glineid": "123e4567-e89b-12d3-a456-426614174004",
      "glinename": "Central Line",
      "gline": "LINESTRING(1 1, 2 2, 3 3)"
    }
    ```

- **404 Not Found:**
  - Description: Geoline not found.
  - Content:
    ```json
    {
      "message": "Geoline not found"
    }
    ```

- **500 Internal Server Error:**
  - Description: Server error.
  - Content:
    ```json
    {
      "message": "Error retrieving geoline"
    }
    ```

---

## Get Geopoint

**GET** `/api/region-marking/getPoint/:id`

Retrieve a geopoint's details by ID.

### Parameters

- **Path Parameters:**
  - `id` (string, required): The unique identifier of the geopoint.

### Responses

- **200 OK:**
  - Description: Geopoint retrieved successfully.
  - Content:
    ```json
    {
      "gpointid": "123e4567-e89b-12d3-a456-426614174008",
      "gpointname": "Odisha",
      "gpoint": "POINT(1 1)"
    }
    ```

- **404 Not Found:**
  - Description: Geopoint not found.
  - Content:
    ```json
    {
      "message": "Geopoint not found"
    }
    ```

- **500 Internal Server Error:**
  - Description: Server error.
  - Content:
    ```json
    {
      "message": "Error retrieving geopoint"
    }
    ```

---


## Update Polygon

**PUT** `/api/region-marking/updatePolygon/:id`

Update a polygon's details by ID.

### Parameters

- **Path Parameters:**
  - `id` (string, required): The unique identifier of the polygon.

- **Body Parameters:**
  - `gpolygonname` (string, required): The name of the polygon.
  - `coordinates` (array of arrays, required): The coordinates of the polygon in an array format, where each coordinate is an array of `[longitude, latitude]`.

### Responses

- **200 OK:**
  - Description: Polygon updated successfully.
  - Content:
    ```json
     {
      "gpolygonid": "123e4567-e89b-12d3-a456-426614174000",
      "gpolygonname": "Zone 1",
      "gpolygon": "0103000020E610000001000000050000000DE02D90A0383740E0BE0E9C33FA53409C33A2B437783940D42B6519E27454407CF2B0506B9A36409F3C2CD49A1A564061C3D32B65B9314037894160E5D054400DE02D90A0383740E0BE0E9C33FA5340"
    }
    ```

- **400 Bad Request:**
  - Description: Missing required fields.
  - Content:
    ```json
    {
      "message": "Missing required fields: gpolygonname or coordinates"
    }
    ```

- **404 Not Found:**
  - Description: Polygon not found.
  - Content:
    ```json
    {
      "message": "Polygon not found"
    }
    ```

- **500 Internal Server Error:**
  - Description: Server error.
  - Content:
    ```json
    {
      "message": "Server error"
    }
    ```
  ---

## Update Geocircle

**PUT** `/api/region-marking/updateCircle/:id`

Update a geocircle's details by ID.

### Parameters

- **Path Parameters:**
  - `id` (string, required): The unique identifier of the geocircle.

- **Body Parameters:**
  - `gcirclename` (string, required): The name of the geocircle.
  - `center` (array of numbers, required): The coordinates of the geocircle center in WKT format. Should be a two-element array where the first element is the longitude and the second element is the latitude.
  - `radius` (number, required): The radius of the geocircle in meters.

### Responses

- **200 OK:**
  - Description: Geocircle updated successfully.
  - Content:
    ```json
    {
      "gcircleid": "123e4567-e89b-12d3-a456-426614174000",
      "gcirclename": "Example Circle",
      "gcenter": "POINT(1 1)",
      "gradius": 1000
    }
    ```

- **400 Bad Request:**
  - Description: Missing required fields.
  - Content:
    ```json
    {
      "message": "Missing required fields: gcirclename, center, or radius"
    }
    ```

- **404 Not Found:**
  - Description: Geocircle not found.
  - Content:
    ```json
    {
      "message": "Geocircle not found"
    }
    ```

- **500 Internal Server Error:**
  - Description: Server error.
  - Content:
    ```json
    {
      "message": "Server error"
    }
    ```



---

## Update Geoline

**PUT** `/api/region-marking/updateLine/:id`

Update a geoline's details by ID.

### Parameters

- **Path Parameters:**
  - `id` (string, required): The unique identifier of the geoline.

- **Body Parameters:**
  - `glinename` (string, required): The name of the geoline.
  - `coordinates` (array of arrays, required): The coordinates of the geoline in WKT format.

### Responses

- **200 OK:**
  - Description: Geoline updated successfully.
  - Content:
    ```json
    {
      "glineid": "123e4567-e89b-12d3-a456-426614174004",
      "glinename": "Central Line",
      "gline": "LINESTRING(1 1, 2 2, 3 3)"
    }
    ```

- **400 Bad Request:**
  - Description: Missing required fields.
  - Content:
    ```json
    {
      "message": "Missing required fields: glinename or coordinates"
    }
    ```

- **404 Not Found:**
  - Description: Geoline not found.
  - Content:
    ```json
    {
      "message": "Geoline not found"
    }
    ```

- **500 Internal Server Error:**
  - Description: Server error.
  - Content:
    ```json
    {
      "message": "Server error"
    }
    ```

---

## Update Geopoint

**PUT** `/api/region-marking/updatePoint/:id`

Update a geopoint's details by ID.

### Parameters

- **Path Parameters:**
  - `id` (string, required): The unique identifier of the geopoint.

- **Body Parameters:**
  - `gpointname` (string, required): The name of the geopoint.
  - `coordinates` (string, required): The coordinates of the geopoint in WKT format.

### Responses

- **200 OK:**
  - Description: Geopoint updated successfully.
  - Content:
    ```json
    {
      "gpointid": "123e4567-e89b-12d3-a456-426614174008",
      "gpointname": "Odisha",
      "gpoint": "POINT(1 1)"
    }
    ```

- **400 Bad Request:**
  - Description: Missing required fields.
  - Content:
    ```json
    {
      "message": "Missing required fields: gpointname or coordinates"
    }
    ```

- **404 Not Found:**
  - Description: Geopoint not found.
  - Content:
    ```json
    {
      "message": "Geopoint not found"
    }
    ```

- **500 Internal Server Error:**
  - Description: Server error.
  - Content:
    ```json
    {
      "message": "Server error"
    }
    ```
