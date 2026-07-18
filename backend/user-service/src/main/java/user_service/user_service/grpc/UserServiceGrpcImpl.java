package user_service.user_service.grpc;

import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import user_service.grpc.*;
import user_service.user_service.dto.UserProfileDto;
import user_service.user_service.service.UserService;

import java.math.BigDecimal;

@GrpcService
@RequiredArgsConstructor
@Slf4j
public class UserServiceGrpcImpl extends UserServiceGrpc.UserServiceImplBase {

    private final UserService userService;

    @Override
    public void getUser(UserRequest request, StreamObserver<UserResponse> responseObserver) {
        log.info("gRPC getUser request for id: {}", request.getId());
        try {
            UserProfileDto userDto = userService.getUserById(request.getId());
            UserResponse response = UserResponse.newBuilder()
                    .setId(userDto.getId())
                    .setName(userDto.getName() != null ? userDto.getName() : "")
                    .setEmail(userDto.getEmail() != null ? userDto.getEmail() : "")
                    .setBalance(userDto.getBalance() != null ? userDto.getBalance().doubleValue() : 0.0)
                    .setDailyLimit(userDto.getDailyLimit() != null ? userDto.getDailyLimit().doubleValue() : 0.0)
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.error("Failed in gRPC getUser: {}", e.getMessage());
            responseObserver.onError(io.grpc.Status.NOT_FOUND
                    .withDescription("User not found: " + e.getMessage())
                    .asRuntimeException());
        }
    }

    @Override
    public void updateBalance(UpdateBalanceRequest request, StreamObserver<UpdateBalanceResponse> responseObserver) {
        log.info("gRPC updateBalance request for id: {}, amount: {}", request.getId(), request.getAmount());
        try {
            userService.updateBalance(request.getId(), BigDecimal.valueOf(request.getAmount()));
            UpdateBalanceResponse response = UpdateBalanceResponse.newBuilder()
                    .setSuccess(true)
                    .setMessage("Balance updated successfully")
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.error("Failed in gRPC updateBalance: {}", e.getMessage());
            UpdateBalanceResponse response = UpdateBalanceResponse.newBuilder()
                    .setSuccess(false)
                    .setMessage(e.getMessage())
                    .build();
            responseObserver.onNext(response);
            responseObserver.onCompleted();
        }
    }
}
