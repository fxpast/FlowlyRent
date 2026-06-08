package com.flowlyrent.service;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.HousekeepingTask;
import com.flowlyrent.model.LinenMovement;
import com.flowlyrent.model.TaskLinenUsage;
import com.flowlyrent.model.enums.MovementDirection;
import com.flowlyrent.repository.LinenMovementRepository;
import com.flowlyrent.repository.TaskLinenUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LinenService {

    private final TaskLinenUsageRepository usageRepo;
    private final LinenMovementRepository movementRepo;

    @Transactional
    public void deductLinenForTask(HousekeepingTask task, AppUser user) {
        if (Boolean.TRUE.equals(task.getLinenDeducted())) return;
        List<TaskLinenUsage> usages = usageRepo.findByTask_Id(task.getId());
        for (TaskLinenUsage usage : usages) {
            if (usage.getQuantity() <= 0) continue;
            LinenMovement mv = new LinenMovement();
            mv.setUser(user);
            mv.setLinenItem(usage.getLinenItem());
            mv.setDirection(MovementDirection.TO_LAUNDRY);
            mv.setQuantity(usage.getQuantity());
            mv.setMovementDate(task.getScheduledDate().toLocalDate());
            mv.setNotes("Auto — tâche #" + task.getId());
            mv.setHousekeepingTaskId(task.getId());
            movementRepo.save(mv);
        }
        task.setLinenDeducted(true);
    }
}
