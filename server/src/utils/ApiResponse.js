class ApiResponse {
  static success(res, statusCode = 200, data = null, message = 'Success') {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, data = null, message = 'Created successfully') {
    return ApiResponse.success(res, 201, data, message);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static paginated(res, data, pagination) {
    return res.status(200).json({
      success: true,
      message: 'Success',
      data,
      pagination,
    });
  }

}

export default ApiResponse;
