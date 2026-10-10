package com.securetrack.backend.dto;

public class VehicleRegisterRequest {
    private String vehicleNo;
    private String vehicleModel;
    private String driverName;
    private String driverPhone;
    private String driverNic;

    public VehicleRegisterRequest() {}

    public String getVehicleNo() { return vehicleNo; }
    public void setVehicleNo(String vehicleNo) { this.vehicleNo = vehicleNo; }

    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getDriverPhone() { return driverPhone; }
    public void setDriverPhone(String driverPhone) { this.driverPhone = driverPhone; }

    public String getDriverNic() { return driverNic; }
    public void setDriverNic(String driverNic) { this.driverNic = driverNic; }
}