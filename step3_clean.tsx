              {/* STEP 3: Review & Confirm */}
              {bulkStep === 3 && (
                <div>
                  {/* Review & Confirm Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <CheckCheck className="w-4 h-4" />
                        Review & Confirm
                      </label>
                      <div className="text-sm font-semibold text-gray-900 bg-green-100 px-3 py-1 rounded-lg flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        {selectedRecipients.length} recipients
                      </div>
                    </div>
                  </div>

                  {/* Recipients Summary */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Recipients Summary
                      </label>
                      <div className="text-sm font-semibold text-gray-900 bg-blue-100 px-3 py-1 rounded-lg">
                        {selectedRecipients.length} selected
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedRecipients.slice(0, 6).map(recipient => {
                          const displayName = recipientNames.get(recipient.phone) || recipient.name;
                          return (
                            <div key={recipient.phone} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                                {displayName.charAt(0) || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                                <p className="text-xs text-gray-500 truncate">{recipient.phone}</p>
                              </div>
                            </div>
                          );
                        })}
                        {selectedRecipients.length > 6 && (
                          <div className="col-span-full text-center py-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <p className="text-sm text-gray-600 font-medium">
                              +{selectedRecipients.length - 6} more recipients
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Message Preview
                      </label>
                      <div className="text-sm text-gray-600">
                        {bulkMessageType} message
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
                      <div className="bg-[#e5ddd5] rounded-xl p-4 max-w-sm mx-auto">
                        <div className="flex justify-end mb-2">
                          <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%]">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                              {bulkMessage || "Your message will appear here..."}
                            </p>
                            <div className="flex items-center justify-end mt-2 gap-1">
                              <span className="text-xs text-gray-500">
                                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {bulkMedia && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-800 font-medium">
                            Media attachment: {bulkMessageType}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sending Method */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Sending Method
                      </label>
                      <div className="text-sm text-gray-600">
                        Choose how to send
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSendingMode("browser")}
                        className={`p-4 rounded-xl font-medium text-sm transition-all border-2 flex flex-col items-center gap-2 ${
                          sendingMode === "browser"
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-blue-50"
                        }`}
                      >
                        <Activity className={`w-5 h-5 ${sendingMode === "browser" ? "text-white" : "text-blue-600"}`} />
                        <span>Browser Sending</span>
                        <span className={`text-xs ${sendingMode === "browser" ? "text-blue-100" : "text-gray-500"}`}>
                          Real-time feedback
                        </span>
                      </button>

                      <button
                        onClick={() => setSendingMode("cloud")}
                        className={`p-4 rounded-xl font-medium text-sm transition-all border-2 flex flex-col items-center gap-2 ${
                          sendingMode === "cloud"
                            ? "bg-purple-600 text-white border-purple-600 shadow-lg"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-purple-50"
                        }`}
                      >
                        <Database className={`w-5 h-5 ${sendingMode === "cloud" ? "text-white" : "text-purple-600"}`} />
                        <span>Cloud Processing</span>
                        <span className={`text-xs ${sendingMode === "cloud" ? "text-purple-100" : "text-gray-500"}`}>
                          Background processing
                        </span>
                      </button>
                    </div>

                    {sendingMode === "cloud" && (
                      <div className="mt-4">
                        <input
                          type="text"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="Campaign name (optional)"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-sm font-medium"
                        />
                      </div>
                    )}
                  </div>

                  {/* Final Confirmation */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <AlertCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-amber-900 mb-2">Ready to Send</h4>
                        <p className="text-sm text-amber-800">
                          You are about to send <strong className="font-bold">{selectedRecipients.length} message{selectedRecipients.length !== 1 ? "s" : ""}</strong> to your recipients.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
