package com.securetrack.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.securetrack.backend.models.ContainerLog;

@Repository
public interface ContainerLogRepository extends JpaRepository<ContainerLog, Long> {
    // අවශ්‍ය නම් මෙතැනට කස්ටම් කිව්රි (Custom Queries) දාගන්න පුළුවන්
}