import React, { useState, useRef, useEffect } from 'react';

import { Upload, BookOpen, FileText, BarChart3, RotateCcw, Volume2, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const JoyStudyApp = () => {
  const [studyData, setStudyData] = useState([]);
const initialUsers = {
  hoo: '10OqBEmzpjamtSBEiBxfua04Z103l0AFrm4zBE1BJ-tA',
  un: '1PCexbIAT1kBQiGlNIN0zzGDwUTVkZrO-7LutKuNhET4',
  min: '10iqO1_5xo2WeQlTMxt0Qt1r8IbpRAJblitJ_a6XNzI0'
};

const [users, setUsers] = useState(initialUsers);
const [userList, setUserList] = useState(Object.keys(initialUsers));
const [selectedUser, setSelectedUser] = useState('user1'); // 사용자 선택 상태
const [selectedSheet, setSelectedSheet] = useState('영단어'); // 기본 탭 이름
  const [selectedSet, setSelectedSet] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [testStats, setTestStats] = useState({});
  const [wrongAnswers, setWrongAnswers] = useState({});
  const [currentTest, setCurrentTest] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [statImages, setStatImages] = useState({});
const addUser = (newUser, sheetID) => {
  setUsers(prev => ({ ...prev, [newUser]: sheetID }));
  setUserList(prev => prev.includes(newUser) ? prev : [...prev, newUser]);
};
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
// 사용자별 기록 불러오기
useEffect(() => {
  const savedWrong = JSON.parse(localStorage.getItem(`${selectedUser}_wrongAnswers`) || '{}');
  const savedStats = JSON.parse(localStorage.getItem(`${selectedUser}_testStats`) || '{}');
  setWrongAnswers(savedWrong);
  setTestStats(savedStats);
}, [selectedUser]);

// 사용자별 오답 저장
useEffect(() => {
  localStorage.setItem(`${selectedUser}_wrongAnswers`, JSON.stringify(wrongAnswers));
}, [wrongAnswers, selectedUser]);

// 사용자별 통계 저장
useEffect(() => {
  localStorage.setItem(`${selectedUser}_testStats`, JSON.stringify(testStats));
}, [testStats, selectedUser]);

// 마지막 사용자 기억
useEffect(() => {
  const savedUser = localStorage.getItem('lastUser');
  if (savedUser) setSelectedUser(savedUser);
}, []);

useEffect(() => {
  localStorage.setItem('lastUser', selectedUser);
}, [selectedUser]);

useEffect(() => {
  const sheetID = users[selectedUser];
  if (!sheetID || !selectedSheet) return;

  const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?tqx=out:json&sheet=${selectedSheet}`;

  fetch(url)
    .then(res => res.text())
    .then(data => {
      const json = JSON.parse(data.substr(47).slice(0, -2));
      const rows = json.table.rows;

      const processedData = rows
        .map(row => row.c)
        .filter(cells => cells && cells.length >= 3 && cells[0] && cells[1] && cells[2])
        .map(cells => ({
          set: cells[0].v,
          question: cells[1].v,
          answer: cells[2].v
        }));

      setStudyData(processedData);
      if (processedData.length > 0) {
        setSelectedSet(processedData[0].set);
      }

      console.log(`${selectedUser}의 시트 '${selectedSheet}'에서 ${processedData.length}개 불러옴`);
    })
    .catch(err => {
      console.error('스프레드시트 로딩 오류:', err);
    });
}, [selectedUser, selectedSheet]);

  // 버튼 스타일 컴포넌트
  const StyledButton = ({ children, onClick, className = '', disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden bg-white text-purple-700 font-semibold py-2 px-6 rounded-lg
        border-2 border-purple-300 transition-all duration-300 hover:bg-purple-50
        before:absolute before:top-0 before:left-0 before:w-0 before:h-full 
        before:bg-purple-100 before:transition-all before:duration-300
        hover:before:w-full before:z-0
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );

  // 파일 업로드 처리
  const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // 1. 파일명에서 사용자 자동 추출
  const fileName = file.name.toLowerCase(); // 예: user1_vocab.xlsx
  const userFromFile = fileName.split('_')[0]; // → user1
  setSelectedUser(userFromFile); // 자동 사용자 설정

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 2. 학습 데이터 파싱
      const processedData = jsonData
        .filter(row => row.length >= 3 && row[0] && row[1] && row[2])
        .map(row => ({
          set: String(row[0]).trim(),
          question: String(row[1]).trim(),
          answer: String(row[2]).trim()
        }));

      // 3. 이전 데이터에 누적 추가
      setStudyData(prev => [...prev, ...processedData]);

      // 4. 세트 자동 선택 (업로드된 데이터 중 첫 번째 세트)
      if (processedData.length > 0) {
        setSelectedSet(processedData[0].set);
      }

      alert(`${userFromFile}의 데이터 ${processedData.length}개가 업로드되었습니다.`);
    } catch (error) {
      alert('파일 읽기 중 오류가 발생했습니다.');
    }
  };

  reader.readAsArrayBuffer(file);
};
  };

  // 이미지 업로드 처리
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const fileName = file.name.toLowerCase();
      if (fileName.includes('test') && (fileName.includes('1') || fileName.includes('2') || fileName.includes('3') || fileName.includes('4') || fileName.includes('5'))) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setStatImages(prev => {
  const match = fileName.match(/(user\d+)_test([1-5])/);
  if (match) {
    const user = match[1]; // user1
    const count = match[2]; // '3'
    return {
      ...prev,
      [`${user}_test${count}`]: e.target.result
    };
  }
  return prev;
});
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // 세트별 데이터 가져오기
  const getSetData = (setName) => {
    return studyData.filter(item => item.set === setName);
  };

  // 세트 목록 가져오기
  const getSets = () => {
  const sets = studyData.map(item => item.set);
  return [...new Set(sets)].sort();
};

  // 음성 재생 (영어 감지)
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const isEnglish = /^[a-zA-Z\s.,!?'"]+$/.test(text);
      if (isEnglish) {
        utterance.lang = 'en-US';
      } else {
        utterance.lang = 'ko-KR';
      }
      speechSynthesis.speak(utterance);
    }
  };

  // 테스트 시작
  const startTest = (isWrongAnswerTest = false) => {
    let questions;
    
    if (isWrongAnswerTest) {
      const wrongData = wrongAnswers[selectedSet] || [];
      questions = wrongData.map(item => ({
        ...item,
        choices: generateChoices(item, getSetData(selectedSet))
      }));
    } else {
      const setData = getSetData(selectedSet);
      questions = setData.map(item => ({
        ...item,
        choices: generateChoices(item, setData)
      }));
    }
    
    setCurrentTest({ questions, isWrongAnswerTest, currentIndex: 0, userAnswers: [] });
    setShowResults(false);
  };

  // 선택지 생성
  const generateChoices = (correctItem, allData) => {
    const choices = [correctItem.answer];
    const otherAnswers = allData
      .filter(item => item.answer !== correctItem.answer)
      .map(item => item.answer);
    
    while (choices.length < 4 && otherAnswers.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherAnswers.length);
      const randomAnswer = otherAnswers[randomIndex];
      if (!choices.includes(randomAnswer)) {
        choices.push(randomAnswer);
      }
      otherAnswers.splice(randomIndex, 1);
    }
    
    return choices.sort(() => Math.random() - 0.5);
  };

  // 답안 제출
  const submitAnswer = (selectedAnswer) => {
    const currentQuestion = currentTest.questions[currentTest.currentIndex];
    const isCorrect = selectedAnswer === currentQuestion.answer;
    
    const newUserAnswers = [...currentTest.userAnswers, {
      question: currentQuestion.question,
      answer: currentQuestion.answer,
      userAnswer: selectedAnswer,
      correct: isCorrect
    }];
    
    if (currentTest.currentIndex < currentTest.questions.length - 1) {
      setCurrentTest(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        userAnswers: newUserAnswers
      }));
    } else {
      // 테스트 완료
      finishTest(newUserAnswers);
    }
  };

  // 테스트 완료 처리
  const finishTest = (answers) => {
    const wrongResults = answers.filter(item => !item.correct);
    
    // 통계 업데이트
    setTestStats(prev => ({
      ...prev,
      [selectedSet]: (prev[selectedSet] || 0) + 1
    }));
    
    if (currentTest.isWrongAnswerTest) {
      // 오답 테스트의 경우, 틀린 것만 다시 오답에 저장
      if (wrongResults.length === 0) {
        // 모두 맞으면 오답 목록에서 제거
        setWrongAnswers(prev => ({
          ...prev,
          [selectedSet]: []
        }));
      } else {
        setWrongAnswers(prev => ({
          ...prev,
          [selectedSet]: wrongResults
        }));
      }
    } else {
      // 일반 테스트의 경우, 틀린 답안을 오답에 저장
      if (wrongResults.length > 0) {
        setWrongAnswers(prev => ({
          ...prev,
          [selectedSet]: wrongResults
        }));
      }
    }
    
    setTestResults(answers);
    setCurrentTest(null);
    setShowResults(true);
  };

  // 통계 이미지 가져오기
  const getStatImage = (count) => {
  const key = `${selectedUser}_test${count}`;
  return statImages[key] || null;
};

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#eed7fd' }}>
      {/* 헤더 */}
      <header className="bg-white shadow-md p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-bold text-purple-700 mb-4 sm:mb-0">Joy Study</h1>

<div className="flex gap-2 mb-4">
  <input
    type="text"
    placeholder="새 사용자 이름"
    id="newUserInput"
    className="p-2 border rounded"
  />
  <input
    type="text"
    placeholder="시트 ID"
    id="newSheetInput"
    className="p-2 border rounded w-[400px]"
  />
<button
  onClick={() => {
    const name = document.getElementById('newUserInput').value.trim();
    const id = document.getElementById('newSheetInput').value.trim();

    if (name && id) {
      addUser(name, id);

      //입력창 초기화
      document.getElementById('newUserInput').value = '';
      document.getElementById('newSheetInput').value = '';
    }
  }}
  className="px-4 py-2 bg-purple-600 text-white rounded"
>
  사용자 추가
</button>

</div>
<div className="flex items-center gap-3 mb-4">
  <label className="text-purple-700 font-medium">사용자:</label>
  <select
    value={selectedUser}
    onChange={(e) => setSelectedUser(e.target.value)}
    className="p-2 border border-purple-300 rounded-lg bg-white text-purple-700"
  >
    {userList.map(user => (
      <option key={user} value={user}>{user}</option>
    ))}
  </select>
</div>


<div className="flex items-center gap-3 mb-4">
  <label className="text-purple-700 font-medium">사용자:</label>
  <select
  value={selectedUser}
  onChange={(e) => setSelectedUser(e.target.value)}
  className="p-2 border border-purple-300 rounded-lg bg-white text-purple-700"
>
  {userList.map(user => (
    <option key={user} value={user}>{user}</option>
  ))}
</select>
</div>
<div className="flex items-center gap-3 mb-4">
  <label className="text-purple-700 font-medium">시트 이름:</label>
  <input
    type="text"
    value={selectedSheet}
    onChange={(e) => setSelectedSheet(e.target.value)}
    placeholder="예: 영단어, 역사, 과학"
    className="p-2 border border-purple-300 rounded-lg bg-white text-purple-700"
  />
</div>
          
          {/* 네비게이션 */}
<nav className="flex flex-wrap gap-2">
            <StyledButton 
              onClick={() => setActiveTab('upload')}
              className={activeTab === 'upload' ? 'bg-purple-100' : ''}
            >
              <Upload className="w-4 h-4 mr-2 inline" />
              파일 업로드
            </StyledButton>
            
            <StyledButton 
              onClick={() => setActiveTab('data')}
              className={activeTab === 'data' ? 'bg-purple-100' : ''}
              disabled={!selectedSet}
            >
              <BookOpen className="w-4 h-4 mr-2 inline" />
              학습데이터
            </StyledButton>
            
            <StyledButton 
              onClick={() => setActiveTab('test')}
              className={activeTab === 'test' ? 'bg-purple-100' : ''}
              disabled={!selectedSet}
            >
              <FileText className="w-4 h-4 mr-2 inline" />
              테스트
            </StyledButton>
            
            <StyledButton 
              onClick={() => setActiveTab('stats')}
              className={activeTab === 'stats' ? 'bg-purple-100' : ''}
              disabled={!selectedSet}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />
              통계
            </StyledButton>
            
            <StyledButton 
              onClick={() => setActiveTab('review')}
              className={activeTab === 'review' ? 'bg-purple-100' : ''}
              disabled={!selectedSet || !wrongAnswers[selectedSet]?.length}
            >
              <RotateCcw className="w-4 h-4 mr-2 inline" />
              오답복습
            </StyledButton>
          </nav>
        </div>
        
        {/* 세트 selector */}
        {studyData.length > 0 && (
          <div className="max-w-6xl mx-auto mt-4">
            <select 
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              className="p-2 border border-purple-300 rounded-lg bg-white text-purple-700"
            >
              {getSets().map(set => (
                <option key={set} value={set}>{set}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-6xl mx-auto p-4">
        {/* 파일 업로드 탭 */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">학습 데이터 업로드</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">엑셀 파일 업로드 (1열: 세트명, 2열: 문제, 3열: 답)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">통계 이미지 업로드 (test1.png ~ test5.png)</label>
<p className="text-sm text-gray-500 mt-1">
  ※ 사용자별 통계 이미지를 등록하려면 파일 이름을 다음과 같이 지정해 주세요:<br />
  <code>user1_test1.png</code>, <code>user2_test3.png</code>, <code>user3_test5.png</code><br />
  (형식: <code>사용자명_test횟수</code>)
</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* 학습데이터 탭 */}
        {activeTab === 'data' && selectedSet && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">학습 데이터 - {selectedSet}</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-purple-100">
                    <th className="border border-gray-300 p-2">번호</th>
                    <th className="border border-gray-300 p-2">문제</th>
                    <th className="border border-gray-300 p-2">답</th>
                    <th className="border border-gray-300 p-2">발음</th>
                  </tr>
                </thead>
                <tbody>
                  {getSetData(selectedSet).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-2">
                        {item.question}
                        <button
                          onClick={() => speakText(item.question)}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="border border-gray-300 p-2">{item.answer}</td>
                      <td className="border border-gray-300 p-2 text-center">
                        <button
                          onClick={() => speakText(item.answer)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 테스트 탭 */}
        {activeTab === 'test' && selectedSet && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {!currentTest && !showResults && (
              <div>
                <h2 className="text-2xl font-bold text-purple-700 mb-4">테스트 - {selectedSet}</h2>
                <StyledButton onClick={() => startTest()}>
                  테스트 시작
                </StyledButton>
              </div>
            )}
            
            {currentTest && (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-semibold">
                      문제 {currentTest.currentIndex + 1} / {currentTest.questions.length}
                    </h3>
                    <div className="w-full bg-gray-200 rounded-full h-2 ml-4">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentTest.currentIndex + 1) / currentTest.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-4">
                    {currentTest.questions[currentTest.currentIndex].question}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentTest.questions[currentTest.currentIndex].choices.map((choice, index) => (
                      <StyledButton
                        key={index}
                        onClick={() => submitAnswer(choice)}
                        className="text-left p-4 hover:bg-purple-50"
                      >
                        {choice}
                      </StyledButton>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {showResults && (
              <div>
                <h2 className="text-2xl font-bold text-purple-700 mb-4">테스트 결과</h2>
                <div className="mb-4">
                  <p className="text-lg">
                    총 {testResults.length}문제 중 {testResults.filter(r => r.correct).length}문제 정답
                    <span className="ml-2 text-green-600 font-semibold">
                      ({Math.round(testResults.filter(r => r.correct).length / testResults.length * 100)}%)
                    </span>
                  </p>
                </div>
                
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${result.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center mb-2">
                        {result.correct ? 
                          <Check className="w-5 h-5 text-green-600 mr-2" /> : 
                          <X className="w-5 h-5 text-red-600 mr-2" />
                        }
                        <span className="font-medium">{result.question}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        정답: {result.answer} | 입력: {result.userAnswer}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <StyledButton onClick={() => setShowResults(false)}>
                    다시 테스트
                  </StyledButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">테스트 통계</h2>
            <div className="space-y-4">
              {getSets().map(set => {
                const count = testStats[set] || 0;
                const maxCount = Math.min(count, 5);
                return (
                  <div key={set} className="flex items-center space-x-4">
                    <div className="w-20 text-sm font-medium">{set}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                      <div 
                        className="bg-purple-600 h-6 rounded-full transition-all duration-300"
                        style={{ width: `${(maxCount / 5) * 100}%` }}
                      ></div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {count}/5
                      </span>
                    </div>
                    {maxCount > 0 && getStatImage(maxCount) && (
                      <img 
                        src={getStatImage(maxCount)} 
                        alt={`test${maxCount}`}
                        className="h-24 w-auto"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 오답복습 탭 */}
        {activeTab === 'review' && selectedSet && wrongAnswers[selectedSet]?.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">오답 복습 - {selectedSet}</h2>
            
            {!currentTest && !showResults && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">오답 목록</h3>
                  <div className="space-y-2">
                    {wrongAnswers[selectedSet].map((item, index) => (
                      <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p><strong>문제:</strong> {item.question}</p>
                        <p><strong>정답:</strong> {item.answer}</p>
                        <p><strong>입력한 답:</strong> {item.userAnswer}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <StyledButton onClick={() => startTest(true)}>
                  오답 테스트 시작
                </StyledButton>
              </div>
            )}
            
            {/* 테스트 진행 중이면 테스트 UI 표시 (위의 테스트 탭과 동일) */}
            {currentTest && (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-semibold">
                      오답 문제 {currentTest.currentIndex + 1} / {currentTest.questions.length}
                    </h3>
                    <div className="w-full bg-gray-200 rounded-full h-2 ml-4">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentTest.currentIndex + 1) / currentTest.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-4">
                    {currentTest.questions[currentTest.currentIndex].question}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentTest.questions[currentTest.currentIndex].choices.map((choice, index) => (
                      <StyledButton
                        key={index}
                        onClick={() => submitAnswer(choice)}
                        className="text-left p-4 hover:bg-purple-50"
                      >
                        {choice}
                      </StyledButton>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {showResults && (
              <div>
                <h2 className="text-2xl font-bold text-purple-700 mb-4">오답 테스트 결과</h2>
                <div className="mb-4">
                  <p className="text-lg">
                    총 {testResults.length}문제 중 {testResults.filter(r => r.correct).length}문제 정답
                    <span className="ml-2 text-green-600 font-semibold">
                      ({Math.round(testResults.filter(r => r.correct).length / testResults.length * 100)}%)
                    </span>
                  </p>
                  {testResults.filter(r => r.correct).length === testResults.length && (
                    <p className="text-green-600 font-semibold mt-2">
                      🎉 모든 문제를 맞혔습니다! 오답 목록에서 제거됩니다.
                    </p>
                  )}
                </div>
                
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${result.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center mb-2">
                        {result.correct ? 
                          <Check className="w-5 h-5 text-green-600 mr-2" /> : 
                          <X className="w-5 h-5 text-red-600 mr-2" />
                        }
                        <span className="font-medium">{result.question}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        정답: {result.answer} | 입력: {result.userAnswer}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <StyledButton onClick={() => setShowResults(false)}>
                    다시 테스트
                  </StyledButton>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default JoyStudyApp;