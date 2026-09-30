cmake_minimum_required(VERSION 3.22.1)
project("secureplayer")

add_library(
        secureplayer
        SHARED
        secure-player-lib.cpp)

find_library(
        log-lib
        log)

target_link_libraries(
        secureplayer
        ${log-lib})