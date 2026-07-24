import cv2
import mediapipe as mp
import math
import numpy as np

# 1. 미디어파이프 초기 세팅
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7, min_tracking_confidence=0.7)

cap = cv2.VideoCapture(0)

# 💡 투명 도화지(레이어)와 펜 설정
canvas = None
px, py = 0, 0 # 이전 펜촉의 위치
current_color = (255, 0, 0) # 기본색: 파랑 (BGR)
brush_size = 5 # 기본 펜 굵기

while cap.isOpened():
    success, image = cap.read()
    if not success:
        break

    image = cv2.flip(image, 1)
    h, w, c = image.shape
    
    # 맨 처음 한 번만 빈 도화지 생성
    if canvas is None:
        canvas = np.zeros_like(image)

    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = hands.process(rgb_image)

    # 2. 손 추적 및 캔버스에 그리기
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            thumb = hand_landmarks.landmark[4]
            index = hand_landmarks.landmark[8]
            
            distance = math.hypot(thumb.x - index.x, thumb.y - index.y)
            ix, iy = int(index.x * w), int(index.y * h)
            
            if distance < 0.05: # 꼬집었을 때 (그리기 모드)
                if px == 0 and py == 0: 
                    px, py = ix, iy # 처음 그리기 시작한 점 저장
                
                # '캔버스' 위에 선을 그립니다. (웹캠 영상 위가 아님!)
                cv2.line(canvas, (px, py), (ix, iy), current_color, brush_size)
                px, py = ix, iy # 현재 위치를 이전 위치로 업데이트
                
                # 내 손가락 끝에 현재 펜 색깔 보여주기
                cv2.circle(image, (ix, iy), int(brush_size/2)+2, current_color, -1)
            else:
                px, py = 0, 0 # 손가락을 떼면 좌표 초기화
    else:
        px, py = 0, 0 # 손이 화면에서 벗어나도 좌표 초기화

    # 3. 캔버스와 웹캠 영상 합성하기 (포토샵 레이어 원리)
    # 캔버스에서 그림이 있는 부분의 '마스크(틀)'를 만듭니다.
    canvas_gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(canvas_gray, 1, 255, cv2.THRESH_BINARY)
    mask_inv = cv2.bitwise_not(mask)
    
    # 웹캠 배경에서 그림 들어갈 자리만 파내고, 캔버스의 그림을 끼워 넣습니다.
    image_bg = cv2.bitwise_and(image, image, mask=mask_inv)
    canvas_fg = cv2.bitwise_and(canvas, canvas, mask=mask)
    image = cv2.add(image_bg, canvas_fg) # 최종 합성!

    cv2.imshow('Reworld Drawing', image)

    # 4. 키보드 입력으로 펜 색상 및 모드 변경 (반드시 영문 키보드 상태!)
    key = cv2.waitKey(1) & 0xFF
    
    if key == ord('r'):
        current_color = (0, 0, 255) # 빨강
        brush_size = 5
        print("🔴 빨간색 펜을 들었습니다.")
    elif key == ord('g'):
        current_color = (0, 255, 0) # 초록
        brush_size = 5
        print("🟢 초록색 펜을 들었습니다.")
    elif key == ord('b'):
        current_color = (255, 0, 0) # 파랑
        brush_size = 5
        print("🔵 파란색 펜을 들었습니다.")
    elif key == ord('e'):
        current_color = (0, 0, 0) # 지우개 (검은색 = 투명)
        brush_size = 30 # 지우개는 굵게!
        print("🧽 지우개를 들었습니다.")
    elif key == ord('c'):
        canvas = np.zeros_like(image) # 캔버스 전체 초기화
        print("🧹 화면을 깨끗하게 지웠습니다.")
    elif key == ord('s'):
        # 투명 스티커 누끼 저장 (캔버스의 색상과 마스크를 조합해 PNG 생성)
        b, g, r = cv2.split(canvas)
        alpha = mask # 그려진 부분만 불투명하게(255), 나머지는 투명하게(0)
        transparent_sticker = cv2.merge((b, g, r, alpha))
        cv2.imwrite('my_transparent_sticker.png', transparent_sticker)
        print("📸 찰칵! 컬러 투명 스티커가 저장되었습니다.")
    elif key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
