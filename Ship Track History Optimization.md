# Ship Track History Optimization

## Overview

This system implements a data retrieval and optimization process for historical location data of tracked objects. It utilizes a path simplification algorithm to reduce the volume of data while preserving the essential shape and characteristics of the movement path. The system accepts unique identifiers for objects and a time range as inputs, fetches the relevant data, and returns an optimized version of the path history.


## The Douglas-Peucker Algorithm

The Douglas-Peucker algorithm, also known as the Ramer–Douglas–Peucker algorithm or iterative end-point fit algorithm, is a line simplification algorithm used in cartography and computer graphics. It's particularly useful for reducing the number of points in a curve that is approximated by a series of points.

### How it Works

1. **Initial Setup**: The algorithm starts with a complex line made up of many points.

2. **End Points**: It uses the first and last points of the line as initial reference points.

3. **Finding the Furthest Point**: It then finds the point that is furthest from the line segment formed by these two end points.

4. **Comparison with Epsilon**: If the point is closer to the line segment than epsilon, all points between the end points can be discarded.

5. **Recursive Division**: If the point is further than epsilon from the line segment, the algorithm recursively divides the line at this point.

6. **Repetition**: This process is repeated for each subsegment until all points in the simplified curve are within epsilon distance of the original curve.

### Benefits

- **Data Reduction**: Significantly reduces the number of points needed to represent a line or curve.
- **Shape Preservation**: Maintains the essential shape characteristics of the original line.
- **Scalability**: The level of simplification can be adjusted by changing the epsilon value.

### Application in Ship Tracking

In the context of ship tracking:
- It helps to reduce the data volume of ship paths while maintaining their essential shape.
- Allows for efficient storage and transmission of track data.
- Enables faster rendering of ship paths in mapping applications.

The algorithm strikes a balance between data reduction and maintaining the accuracy of the ship's movement, making it ideal for optimizing large datasets of historical ship tracks.



## Key Components

### 1. Helper Functions

#### `perpendicularDistance(point, lineStart, lineEnd)`

- **Purpose**: Calculates the perpendicular distance from a point to a line segment.
- **Usage**: Core component of the Douglas-Peucker algorithm.
- **Benefit**: Enables identification of points that deviate most from a straight line.

#### `simplifyLine(points, epsilon, result, start, end)`

- **Purpose**: Recursively simplifies a line using the Douglas-Peucker algorithm.
- **Usage**: Called by `optimizeLine` to reduce the number of points in the track.
- **Benefit**: Efficiently simplifies the track while preserving its essential shape.

#### `optimizeLine(points, epsilon)`

- **Purpose**: Initiates and manages the line simplification process.
- **Usage**: Called with the full set of track points to produce a simplified version.
- **Benefit**: Provides a high-level interface for track simplification.

### 2. Main Controller Function

#### `getShipTrackHistory(req, res)`

- **Purpose**: Handles API requests for retrieving a ship's track history.
- **Key steps**:
  1. Validates input parameters (UUID and hours).
  2. Queries the database for track history data.
  3. Simplifies the track data using the optimization functions.
  4. Returns the simplified track history with metadata.

## Workflow

1. Receive request with ship's UUID and time range (hours).
2. Validate inputs (UUID format and hours value).
3. Calculate the start time for the query based on the specified hours.
4. Execute a database query to fetch raw track history data.
5. Extract coordinates and prepare for simplification.
6. Apply the Douglas-Peucker algorithm to simplify the track.
7. Reconstruct the simplified track with all original data for remaining points.
8. Return the response with simplified track history and metadata.

## The Role of Epsilon

The `epsilon` value (set to 0.0004 in this code) is crucial in the Douglas-Peucker algorithm:

- **Purpose**: Determines the level of simplification applied to the track.
- **How it works**: 
  - Points farther from the line than this value are kept; others may be removed.
  - Smaller epsilon: More detailed track, more points retained.
  - Larger epsilon: More simplified track, fewer points retained.
- **Current value**: 0.0004 (units depend on coordinate system)
- **Impact on output**: 
  - Balances data reduction with track accuracy.
  - Significantly affects the number of points in the final track.

## Benefits

1. **Data Efficiency**: Reduces data volume, improving transmission speed and reducing bandwidth usage.
2. **Performance**: Fewer points enable faster client-side rendering and processing.
3. **Scalability**: Allows handling of longer time periods or more frequent updates without system overload.
4. **Flexibility**: Adjustable epsilon value for fine-tuning simplification based on specific needs.

## Considerations

- Epsilon value should be chosen based on application requirements, map scale, required precision, and typical ship movement patterns.
- Very small epsilon values may result in minimal simplification.
- Very large epsilon values might oversimplify the track, potentially losing important details.
- Most effective for tracks with a mix of straight lines and curves.

## Error Handling

- Validates UUID format and hours parameter.
- Handles cases where no track history is found.
- Includes general error catching and appropriate HTTP status responses.

This implementation provides an efficient and flexible solution for handling ship track history data, balancing accuracy with data reduction benefits.# Ship Track History Optimization

